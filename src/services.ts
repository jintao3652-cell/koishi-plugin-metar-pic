import axios from 'axios';
import { 
  AirportInfo, 
  RunwayInfo, 
  ParsedMETAR, 
  SunTimes, 
  Config, 
  WindComponents 
} from './types';
import { API_SOURCES } from './api-sources';

// 日出日落服务
export class SunTimeService {
  static async getSunTimes(lat: number, lon: number, config: Config): Promise<SunTimes | null> {
    try {
      const now = new Date();
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      const response = await axios.post(
        'https://open.apihub.net/api/sun-rising',
        {
          lon: lon,
          lat: lat,
          date: date
        },
        {
          headers: {
            'apihub-token': config.apihub_token,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data && response.data.code === 200) {
        return {
          sunrise: response.data.data.sunrise,
          sunset: response.data.data.sunset
        };
      }
    } catch (error) {
      console.error('获取日出日落时间失败:', error);
    }
    return null;
  }
}

// 机场信息服务
export class AirportService {
  static async getAirportInfo(icao: string): Promise<AirportInfo | null> {
    try {
      const response = await axios.get(`https://api.xflysim.com/pilot/api/realTimeMap/airports/${icao.toLowerCase()}`);
      if (response.data.code === 20000) {
        return response.data.data;
      }
    } catch (error) {
      console.error('获取机场信息失败:', error);
    }
    return null;
  }

  static async getRunways(icao: string): Promise<RunwayInfo[]> {
    try {
      const response = await axios.get(`https://api.xflysim.com/pilot/api/realTimeMap/runway/${icao.toLowerCase()}`);
      if (response.data.code === 20000) {
        return response.data.data;
      }
    } catch (error) {
      console.error('获取跑道信息失败:', error);
    }
    return [];
  }
}

// METAR解析服务
export class METARParser {
  static parse(metarString: string): ParsedMETAR {
    const parsed: ParsedMETAR = {
      station: '',
      time: '',
      windDirection: '',
      windSpeed: '',
      windGust: '',
      windUnit: '',
      visibility: '',
      weather: [],
      temperature: '',
      dewpoint: '',
      pressure: '',
      pressureUnit: 'hPa',
      clouds: [],
      raw: metarString
    };

    if (!metarString) return parsed;

    try {
      // 基本METAR解析
      const parts = metarString.split(' ');
      parsed.station = parts[0];
      
      // 解析时间 (DDHHMMZ)
      const timeMatch = metarString.match(/(\d{6})Z/);
      if (timeMatch) {
        parsed.time = timeMatch[1];
      }

      // 解析风
      const windMatch = metarString.match(/(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?(KT|MPS)/);
      if (windMatch) {
        parsed.windDirection = windMatch[1];
        parsed.windSpeed = windMatch[2];
        parsed.windGust = windMatch[4] || '';
        parsed.windUnit = windMatch[5];
      }

      // 解析能见度
      const visMatch = metarString.match(/(\d{4})(?=\s)/);
      if (visMatch) {
        parsed.visibility = visMatch[1];
      }

      // 解析天气现象
      const weatherCodes = ['BR', 'FG', 'HZ', 'FU', 'VA', 'DU', 'SA', 'SS', 'DS', 'SG', 'IC', 'PL', 'GR', 'GS', 'UP', 'RA', 'DZ', 'SN', 'SQ', 'FC', 'TS', 'MI', 'PR', 'BC', 'DR', 'BL', 'SH', 'VCTS', 'VCSH', 'VCFG', '\\+', '\\-'];
      const weatherRegex = new RegExp(`\\b(${weatherCodes.join('|')})+\\b`, 'g');
      const weatherMatches = metarString.match(weatherRegex);
      if (weatherMatches) {
        parsed.weather = weatherMatches;
      }

      // 解析温度/露点
      const tempMatch = metarString.match(/(M?\d{2})\/(M?\d{2})/);
      if (tempMatch) {
        parsed.temperature = tempMatch[1].replace('M', '-');
        parsed.dewpoint = tempMatch[2].replace('M', '-');
      }

      // 解析气压
      const pressureMatchQNH = metarString.match(/Q(\d{4})/);
      const pressureMatchINHG = metarString.match(/A(\d{4})/);
      
      if (pressureMatchQNH) {
        parsed.pressure = pressureMatchQNH[1];
        parsed.pressureUnit = 'hPa';
      } else if (pressureMatchINHG) {
        const inhgValue = parseInt(pressureMatchINHG[1]) / 100;
        const hPaValue = Math.round(inhgValue * 33.8639);
        parsed.pressure = `${hPaValue} (${inhgValue.toFixed(2)} INHG)`;
        parsed.pressureUnit = 'INHG';
      }

      // 解析云量
      const cloudRegex = /(FEW|SCT|BKN|OVC|NSC|SKC|CLR|VV)(\d{3})?/g;
      let cloudMatch;
      while ((cloudMatch = cloudRegex.exec(metarString)) !== null) {
        if (cloudMatch[1] === 'NSC' || cloudMatch[1] === 'SKC' || cloudMatch[1] === 'CLR') {
          parsed.clouds.push({
            type: cloudMatch[1],
            height: '0'
          });
        } else {
          parsed.clouds.push({
            type: cloudMatch[1],
            height: cloudMatch[2] ? (parseInt(cloudMatch[2]) * 100).toString() : '0'
          });
        }
      }

    } catch (error) {
      console.error('METAR解析错误:', error);
    }

    return parsed;
  }
}

// 风分量计算服务
export class WindComponentCalculator {
  static calculateWindComponents(
    windDirection: number, 
    windSpeed: number, 
    runwayHeading: number
  ): WindComponents {
    const angleDiff = Math.abs(windDirection - runwayHeading);
    const angleRad = (angleDiff * Math.PI) / 180;
    
    const headwind = Math.cos(angleRad) * windSpeed;
    const crosswind = Math.sin(angleRad) * windSpeed;
    
    return {
      headwind: Math.round(headwind * 10) / 10,
      crosswind: Math.round(Math.abs(crosswind) * 10) / 10
    };
  }
}

// 飞行规则判定服务
export class FlightRulesCalculator {
  static getFlightRules(parsedMETAR: ParsedMETAR): string {
    const visibility = parseInt(parsedMETAR.visibility) || 9999;
    const clouds = parsedMETAR.clouds;
    
    let ceiling = 9999;
    for (const cloud of clouds) {
      if (cloud.type === 'BKN' || cloud.type === 'OVC') {
        const height = parseInt(cloud.height) || 9999;
        if (height < ceiling) {
          ceiling = height;
        }
      }
    }

    if (visibility >= 5000 && ceiling >= 1000) {
      return 'VFR';
    } else if (visibility >= 1500 && ceiling >= 500) {
      return 'MVFR';
    } else if (visibility >= 800 && ceiling >= 200) {
      return 'IFR';
    } else {
      return 'LIFR';
    }
  }
}

// 获取METAR数据的函数
export async function fetchMETARData(icao: string, config: Config): Promise<{ metar: string; taf: string }> {
  let metar = '';
  let taf = '';

  // 优先使用主数据源
  const primarySource = API_SOURCES[config.primarySource];
  const otherSources = Object.values(API_SOURCES).filter(source => source.name !== config.primarySource);

  // 首先尝试主数据源
  if (primarySource) {
    try {
      if (config.consoleinfo) {
        console.log(`优先从主数据源 ${primarySource.name} 获取 ${icao} 的METAR数据`);
      }

      const response = await axios.get(primarySource.metarUrl(icao), { timeout: 10000 });
      
      if (response.data) {
        const parsed = primarySource.parseMetar(response.data);
        if (parsed.metar) {
          metar = parsed.metar;
          taf = parsed.taf;
          
          // 如果有TAF数据，尝试获取完整的TAF
          if (!taf && primarySource.tafUrl) {
            try {
              const tafResponse = await axios.get(primarySource.tafUrl(icao), { timeout: 10000 });
              if (tafResponse.data && primarySource.parseTaf) {
                taf = primarySource.parseTaf(tafResponse.data);
              }
            } catch (tafError) {
              if (config.consoleinfo) {
                console.log(`从主数据源 ${primarySource.name} 获取TAF数据失败:`, tafError.message);
              }
            }
          }

          if (metar) {
            if (config.consoleinfo) {
              console.log(`成功从主数据源 ${primarySource.name} 获取METAR数据:`, metar);
            }
            return { metar, taf };
          }
        }
      }
    } catch (error) {
      if (config.consoleinfo) {
        console.log(`从主数据源 ${primarySource.name} 获取数据失败:`, error.message);
      }
    }
  }

  // 主数据源失败，尝试其他数据源
  for (const source of otherSources) {
    try {
      if (config.consoleinfo) {
        console.log(`尝试从备用数据源 ${source.name} 获取 ${icao} 的METAR数据`);
      }

      const response = await axios.get(source.metarUrl(icao), { timeout: 10000 });
      
      if (response.data) {
        const parsed = source.parseMetar(response.data);
        if (parsed.metar) {
          metar = parsed.metar;
          taf = parsed.taf;
          
          // 如果有TAF数据，尝试获取完整的TAF
          if (!taf && source.tafUrl) {
            try {
              const tafResponse = await axios.get(source.tafUrl(icao), { timeout: 10000 });
              if (tafResponse.data && source.parseTaf) {
                taf = source.parseTaf(tafResponse.data);
              }
            } catch (tafError) {
              if (config.consoleinfo) {
                console.log(`从备用数据源 ${source.name} 获取TAF数据失败:`, tafError.message);
              }
            }
          }

          if (metar) {
            if (config.consoleinfo) {
              console.log(`成功从备用数据源 ${source.name} 获取METAR数据:`, metar);
            }
            break;
          }
        }
      }
    } catch (error) {
      if (config.consoleinfo) {
        console.log(`从备用数据源 ${source.name} 获取数据失败:`, error.message);
      }
      continue;
    }
  }

  return { metar, taf };
}

// 文本输出格式化
export function formatTextOutput(
  icao: string,
  metar: string,
  taf: string,
  parsedMETAR: ParsedMETAR,
  airportInfo: AirportInfo,
  flightRules: string,
  sunTimes: SunTimes,
  config: Config
): string {
  const airportName = airportInfo ? `${airportInfo.cnName} (${airportInfo.enName})` : icao;
  const elevation = airportInfo ? `${airportInfo.elevationFt} ft` : '未知';
  
  let output = `🌤️ 机场 ${icao} 气象信息\n`;
  output += `📍 ${airportName}\n`;
  output += `📏 海拔: ${elevation}\n\n`;
  
  output += `📊 飞行规则: ${getFlightRulesEmoji(flightRules)} ${flightRules}\n`;
  output += `🌡️ 温度: ${parsedMETAR.temperature || 'N/A'}°C\n`;
  output += `💧 露点: ${parsedMETAR.dewpoint || 'N/A'}°C\n`;
  output += `📏 能见度: ${parsedMETAR.visibility || 'N/A'} 米\n`;
  output += `💨 风向: ${parsedMETAR.windDirection || 'N/A'}° 风速: ${parsedMETAR.windSpeed || '0'} ${parsedMETAR.windUnit || 'KT'}\n`;
  if (parsedMETAR.windGust) {
    output += `💨 阵风: ${parsedMETAR.windGust} ${parsedMETAR.windUnit || 'KT'}\n`;
  }
  output += `📊 气压: ${parsedMETAR.pressure || 'N/A'} ${ 'HPA'}\n\n`;
  
  // 云层信息
  if (parsedMETAR.clouds.length > 0) {
    output += `☁️ 云层信息:\n`;
    parsedMETAR.clouds.forEach(cloud => {
      const cloudDescription = config.cloudCoverageMap.find(item => item.code === cloud.type)?.description || cloud.type;
      if (cloud.type === 'NSC' || cloud.type === 'SKC' || cloud.type === 'CLR') {
        output += `   - ${cloudDescription}\n`;
      } else {
        output += `   - ${cloudDescription} ${cloud.height} ft\n`;
      }
    });
  } else {
    output += `☀️ 无显著云层\n`;
  }
  
  // 天气现象
  if (parsedMETAR.weather.length > 0) {
    const weatherDescriptions = parsedMETAR.weather.map(code => {
      return config.weatherMap.find(item => item.code === code)?.description || code;
    });
    output += `🌦️ 天气现象: ${weatherDescriptions.join(', ')}\n`;
  }
  
  // 日出日落时间
  if (sunTimes) {
    output += `\n🌅 日出: ${sunTimes.sunrise} | 🌇 日落: ${sunTimes.sunset}\n`;
  }
  
  output += `\n📝 METAR: ${metar}\n`;
  if (taf) {
    output += `📝 TAF: ${taf}\n`;
  }
  
  return output;
}

// 获取飞行规则对应的表情符号
function getFlightRulesEmoji(flightRules: string): string {
  switch (flightRules) {
    case 'VFR': return '🟢';
    case 'MVFR': return '🔵';
    case 'IFR': return '🟡';
    case 'LIFR': return '🔴';
    default: return '⚪';
  }
}
