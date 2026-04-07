import { Context, Schema, h } from 'koishi';
import { } from 'koishi-plugin-puppeteer';
import axios from 'axios';

// 类型定义
export interface AirportInfo {
  longitudeDeg: number;
  elevationFt: number;
  continent: string;
  isoRegion: string;
  gpsCode: string;
  ident: string;
  municipality: string;
  type: string;
  latitudeDeg: number;
  municipalityCn: string;
  iataCode: string;
  cnName: string;
  enName: string;
  isoCountry: string;
}

export interface RunwayInfo {
  id: string;
  airportIdent: string;
  leIdent: string;
  heIdent: string;
  leHeadingDegt: string;
  heHeadingDegt: string;
  lengthFt: number;
  widthFt: number;
  surface: string;
  lighted: string;
  closed: string;
  leLatitudeDeg: number;
  leLongitudeDeg: number;
  heLatitudeDeg: number;
  heLongitudeDeg: number;
  leElevationFt: string;
  heElevationFt: string;
}

export interface ParsedMETAR {
  station: string;
  time: string;
  windDirection: string;
  windSpeed: string;
  windGust: string;
  windUnit: string;
  visibility: string;
  weather: string[];
  temperature: string;
  dewpoint: string;
  pressure: string;
  pressureUnit: string;
  clouds: Array<{
    type: string;
    height: string;
  }>;
  raw: string;
}

export interface SunTimes {
  sunrise: string;
  sunset: string;
}

export interface Config {
  commandname: string;
  commandalias: string;
  outputMode: 'text' | 'image' | 'both';
  imageMode: 'auto' | 'manual';
  screenshotquality: number;
  imageWidth?: number;
  imageHeight?: number;
  weatherMap: Array<{ code: string; description: string }>;
  cloudCoverageMap: Array<{ code: string; description: string }>;
  consoleinfo: boolean;
  pageautoclose: boolean;
  apihub_token: string;
  primarySource: 'xflysim' | 'etops' | 'xbzglw'; // 新增主气象源选择
}

export const Config = Schema.intersect([
  Schema.object({
    commandname: Schema.string().default("metar").description("注册的指令名称"),
    commandalias: Schema.string().default("气象").description("注册的指令别名"),
  }).description('基础设置'),

  Schema.object({
    outputMode: Schema.union([
      Schema.const('text').description('仅文字输出'),
      Schema.const('image').description('仅图片输出'),
      Schema.const('both').description('图片和文字一起输出'),
    ]).default('text').description('输出格式选择'),
  }).description('输出设置'),

  Schema.object({
    imageMode: Schema.union([
      Schema.const('auto').description('自动截图对应大小的元素'),
      Schema.const('manual').description('手动指定渲染大小'),
    ]).description('渲染模式选择').default("auto"),
    screenshotquality: Schema.number().default(80).min(30).max(100).role('slider').description('渲染质量（%）'),
  }).description('渲染设置'),

  Schema.union([
    Schema.object({
      imageMode: Schema.const("auto"),
    }),
    Schema.object({
      imageMode: Schema.const("manual").required(),
      imageWidth: Schema.number().default(1600).description('生成图片的宽度'),
      imageHeight: Schema.number().default(900).description('生成图片的高度'),
    }),
  ]),

  Schema.object({
    primarySource: Schema.union([
      Schema.const('xflysim').description('XFLYSIM'),
      Schema.const('etops').description('ETOPS'),
      Schema.const('xbzglw').description('XBZGLW'),
    ]).default('xflysim').description('首选气象数据源'),
  }).description('数据源设置'),

  Schema.object({
    weatherMap: Schema.array(Schema.object({
      code: Schema.string().required().description('天气代码'),
      description: Schema.string().required().description('天气描述'),
    })).role('table').default([
      { code: 'BR', description: '雾' },
      { code: 'FG', description: '雾或薄雾' },
      { code: 'HZ', description: '霾' },
      { code: 'FU', description: '烟雾' },
      { code: 'VA', description: '火山灰' },
      { code: 'DU', description: '沙尘' },
      { code: 'SA', description: '沙' },
      { code: 'SS', description: '尘暴' },
      { code: 'DS', description: '风沙' },
      { code: 'SG', description: '雪粒' },
      { code: 'IC', description: '冰晶' },
      { code: 'PL', description: '霰' },
      { code: 'GR', description: '冰雹' },
      { code: 'GS', description: '小冰雹' },
      { code: 'UP', description: '未知降水' },
      { code: 'RA', description: '雨' },
      { code: 'DZ', description: '毛毛雨' },
      { code: 'SN', description: '雪' },
      { code: 'SQ', description: '飑线' },
      { code: 'FC', description: '风暴' },
      { code: 'TS', description: '雷暴' },
      { code: 'MI', description: '微型沙尘暴' },
      { code: 'PR', description: '部分地区' },
      { code: 'BC', description: '局部' },
      { code: 'DR', description: '吹动的尘土或雪花' },
      { code: 'BL', description: '风暴' },
      { code: 'SH', description: '阵性降水' },
      { code: '+', description: '大' },
      { code: '-', description: '小' },
      { code: 'VCTS', description: '附近有雷暴' },
      { code: 'VCSH', description: '附近有阵性降水' },
      { code: 'VCFG', description: '附近有雾' },
    ]).description('天气现象映射表'),
    cloudCoverageMap: Schema.array(Schema.object({
      code: Schema.string().required().description('云层代码'),
      description: Schema.string().required().description('云层描述'),
    })).role('table').default([
      { code: 'FEW', description: '少云 (1/8 - 2/8)' },
      { code: 'SCT', description: '疏云 (3/8 - 4/8)' },
      { code: 'BKN', description: '多云 (5/8 - 7/8)' },
      { code: 'OVC', description: '满天云 (8/8)' },
      { code: 'NSC', description: '无显著云层' },
      { code: 'SKC', description: '晴空' },
      { code: 'CLR', description: '晴朗' },
      { code: 'VV', description: '垂直能见度' },
    ]).description('云层覆盖映射表'),
  }).description('映射表设置'),

  Schema.object({
    apihub_token: Schema.string().description('APIHUB Token（用于获取日出日落时间）').required(),
  }).description('API设置'),

  Schema.object({
    consoleinfo: Schema.boolean().default(false).description('日志调试模式'),
    pageautoclose: Schema.boolean().default(true).description('自动page关闭'),
  }).description('开发者选项'),
]);

export const name = 'metar-weather';
export const inject = ['puppeteer'];

// API配置
interface APISource {
  name: string;
  metarUrl: (icao: string) => string;
  parseMetar: (data: any) => { metar: string; taf: string };
  tafUrl?: (icao: string) => string;
  parseTaf?: (data: any) => string;
}

const API_SOURCES: { [key: string]: APISource } = {
  xbzglw: {
    name: 'xbzglw',
    metarUrl: (icao: string) => `http://xbzglw.com/xbinfo/app/common/airrpt/query?ccccs=${icao}&type=SA&type=SP&type=FC&type=FT&hour=0`,
    parseMetar: (data: any): { metar: string, taf: string } => {
      const text = data.toString();
      const lines = text.split('\n');
      let metar = '', taf = '';
      
      for (const line of lines) {
        if (line.includes('METAR')) metar = line.split('METAR')[1]?.trim() || '';
        if (line.includes('TAF')) taf = line.split('TAF')[1]?.trim() || '';
      }
      
      return { metar, taf };
    }
  },
  xflysim: {
    name: 'xflysim',
    metarUrl: (icao: string) => `https://api.xflysim.com/pilot/api/realTimeMap/weather/${icao}`,
    tafUrl: (icao: string) => `https://api.xflysim.com/pilot/api/realTimeMap/weatherForecast/${icao}`,
    parseMetar: (data: any): { metar: string, taf: string } => {
      if (data.code === 20000) {
        return {
          metar: data.data.metar || '',
          taf: ''
        };
      }
      return { metar: '', taf: '' };
    },
    parseTaf: (data: any): string => {
      if (data.code === 20000) {
        return data.data.taf || '';
      }
      return '';
    }
  },
  etops: {
    name: 'etops',
    metarUrl: (icao: string) => `https://api.etops.top/api/v1/weather/metar/${icao}`,
    tafUrl: (icao: string) => `https://api.etops.top/api/v1/weather/taf/${icao}`,
    parseMetar: (data: any): { metar: string, taf: string } => {
      if (data.code === 0) {
        let metar = data.data.line || '';
        if (metar.startsWith('"') && metar.endsWith('"')) {
          metar = metar.slice(1, -1);
        }
        return { metar, taf: '' };
      }
      return { metar: '', taf: '' };
    },
    parseTaf: (data: any): string => {
      if (data.code === 0) {
        return data.data.line || '';
      }
      return '';
    }
  }
};

// 日出日落服务
class SunTimeService {
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
class AirportService {
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

// METAR解析服务 - 修复INHG读取和天气代码解析
class METARParser {
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

      // 解析天气现象 - 改进天气代码解析
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

      // 解析气压 - 修复INHG读取问题
      const pressureMatchQNH = metarString.match(/Q(\d{4})/);
      const pressureMatchINHG = metarString.match(/A(\d{4})/);
      
      if (pressureMatchQNH) {
        parsed.pressure = pressureMatchQNH[1];
        parsed.pressureUnit = 'hPa';
      } else if (pressureMatchINHG) {
        // 将英寸汞柱转换为百帕显示，同时保留原始值
        const inhgValue = parseInt(pressureMatchINHG[1]) / 100;
        const hPaValue = Math.round(inhgValue * 33.8639);
        parsed.pressure = `${hPaValue} (${inhgValue.toFixed(2)} INHG)`;
        parsed.pressureUnit = 'INHG';
      }

      // 解析云量 - 改进云层代码解析
      const cloudRegex = /(FEW|SCT|BKN|OVC|NSC|SKC|CLR|VV)(\d{3})?/g;
      let cloudMatch;
      while ((cloudMatch = cloudRegex.exec(metarString)) !== null) {
        if (cloudMatch[1] === 'NSC' || cloudMatch[1] === 'SKC' || cloudMatch[1] === 'CLR') {
          // 无云情况
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
class WindComponentCalculator {
  // 计算跑道风分量
  static calculateWindComponents(windDirection: number, windSpeed: number, runwayHeading: number): { headwind: number; crosswind: number } {
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

// 飞行规则判定
class FlightRulesCalculator {
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

    // VFR条件
    if (visibility >= 5000 && ceiling >= 1000) {
      return 'VFR';
    }
    // MVFR条件  
    else if (visibility >= 1500 && ceiling >= 500) {
      return 'MVFR';
    }
    // IFR条件
    else if (visibility >= 800 && ceiling >= 200) {
      return 'IFR';
    }
    // LIFR条件
    else {
      return 'LIFR';
    }
  }
}

// 获取METAR数据的函数实现 - 修改为优先使用主数据源
async function fetchMETARData(icao: string, config: Config): Promise<{ metar: string; taf: string }> {
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

// 文本输出格式化的函数实现
function formatTextOutput(
  icao: string,
  metar: string,
  taf: string,
  parsedMETAR: ParsedMETAR,
  airportInfo: AirportInfo,
  flightRules: string,
  sunTimes: SunTimes,
  config: Config  // 添加config参数用于翻译
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
  
  // 云层信息 - 使用映射表翻译
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
  
  // 天气现象 - 使用映射表翻译
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

export function apply(ctx: Context, config: Config) {
  const command = ctx.command(`${config.commandname} <icao:string>`)
    .alias(config.commandalias)
    .action(async ({ session }, icao) => {
      if (!icao) {
        return '请输入机场ICAO代码，例如：metar ZBAA';
      }

      if (!/^[A-Z]{4}$/.test(icao.toUpperCase())) {
        return 'ICAO代码格式错误，应为4个大写字母，例如：ZBAA';
      }

      icao = icao.toUpperCase();

      try {
        // 获取机场信息
        const airportInfo = await AirportService.getAirportInfo(icao);
        
        // 并行获取其他数据
        const [runways, metarData, sunTimes] = await Promise.all([
          AirportService.getRunways(icao),
          fetchMETARData(icao, config),
          airportInfo ? SunTimeService.getSunTimes(airportInfo.latitudeDeg, airportInfo.longitudeDeg, config) : Promise.resolve(null)
        ]);

        if (!metarData.metar) {
          return `无法获取 ${icao} 的METAR数据`;
        }

        // 解析METAR
        const parsedMETAR = METARParser.parse(metarData.metar);
        
        // 计算风分量和飞行规则
        const windDirection = parseInt(parsedMETAR.windDirection) || 0;
        const windSpeed = parseInt(parsedMETAR.windSpeed) || 0;
        
        // 计算所有跑道的风分量并按逆风分量排序
        let runwayWindComponents = runways.map(runway => {
          const heading = parseInt(runway.leHeadingDegt) || 0;
          return {
            runway,
            components: WindComponentCalculator.calculateWindComponents(windDirection, windSpeed, heading)
          };
        });

        // 按逆风分量从大到小排序（逆风优先）
        runwayWindComponents.sort((a, b) => b.components.headwind - a.components.headwind);

        const flightRules = FlightRulesCalculator.getFlightRules(parsedMETAR);

        // 修复艾特用户问题 - 使用正确的格式
        const userMention = session ? h('at', { id: session.userId }) : '';

        // 根据输出模式返回结果
        if (config.outputMode === 'text') {
          const textOutput = formatTextOutput(icao, metarData.metar, metarData.taf, parsedMETAR, airportInfo, flightRules, sunTimes, config);
          return userMention ? [userMention, textOutput] : textOutput;
        } else if (config.outputMode === 'image') {
          const imageOutput = await generateImageOutput(
            ctx, icao, metarData.metar, metarData.taf, parsedMETAR, 
            airportInfo, runways, runwayWindComponents, flightRules, config, sunTimes
          );
          // 图片模式下也要艾特用户
          return userMention ? [userMention, imageOutput] : imageOutput;
        } else {
          const textOutput = formatTextOutput(icao, metarData.metar, metarData.taf, parsedMETAR, airportInfo, flightRules, sunTimes, config);
          const imageOutput = await generateImageOutput(
            ctx, icao, metarData.metar, metarData.taf, parsedMETAR,
            airportInfo, runways, runwayWindComponents, flightRules, config, sunTimes
          );
          // 混合模式下也要艾特用户
          return userMention ? [userMention, textOutput, imageOutput] : [textOutput, imageOutput];
        }

      } catch (error) {
        if (config.consoleinfo) {
          console.error('气象查询错误:', error);
        }
        return `查询气象数据时出现错误: ${error.message}`;
      }
    });

  // 图片输出生成
  async function generateImageOutput(
    ctx: Context, 
    icao: string, 
    metar: string, 
    taf: string, 
    parsedMETAR: ParsedMETAR,
    airportInfo: AirportInfo,
    runways: RunwayInfo[],
    runwayWindComponents: any[],
    flightRules: string,
    config: Config,
    sunTimes: SunTimes
  ) {
    // 检查 puppeteer 是否可用
    if (!ctx.puppeteer) {
      const textOutput = formatTextOutput(icao, metar, taf, parsedMETAR, airportInfo, flightRules, sunTimes, config);
      return `图片生成功能需要安装 puppeteer 插件，以下是文本格式的气象信息：\n\n${textOutput}`;
    }

    try {
      const page = await ctx.puppeteer.page();
      
      // 设置视口大小以提高清晰度
      if (config.imageMode === 'manual') {
        await page.setViewport({
          width: config.imageWidth,
          height: config.imageHeight,
          deviceScaleFactor: 2
        });
      } else {
        await page.setViewport({
          width: 1920,
          height: 1080,
          deviceScaleFactor: 2
        });
      }

      // 创建现代化的HTML内容
      const htmlContent = createModernWeatherHTML(
        icao, metar, taf, parsedMETAR, airportInfo, 
        runways, runwayWindComponents, flightRules, config, sunTimes
      );

      // 设置页面内容
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // 截图选项
      const screenshotOptions: any = {
        type: 'jpeg',
        quality: config.screenshotquality,
        encoding: 'binary'
      };

      // 设置截图尺寸
      if (config.imageMode === 'manual') {
        screenshotOptions.clip = {
          x: 0,
          y: 0,
          width: config.imageWidth,
          height: config.imageHeight
        };
      } else {
        // 自动模式 - 根据内容调整大小
        const element = await page.$('.weather-container');
        if (element) {
          const boundingBox = await element.boundingBox();
          if (boundingBox) {
            screenshotOptions.clip = {
              x: boundingBox.x,
              y: boundingBox.y,
              width: Math.ceil(boundingBox.width),
              height: Math.ceil(boundingBox.height)
            };
          }
        }
      }

      // 截图
      const screenshot = await page.screenshot(screenshotOptions) as unknown as Buffer;

      // 关闭页面（如果启用自动关闭）
      if (config.pageautoclose) {
        await page.close();
      }

      return h.image(screenshot, 'image/jpeg');

    } catch (error) {
      if (config.consoleinfo) {
        console.error('图片生成错误:', error);
      }
      // 图片生成失败时回退到文本输出
      const textOutput = formatTextOutput(icao, metar, taf, parsedMETAR, airportInfo, flightRules, sunTimes, config);
      return `生成图片时出现错误，以下是文本格式的气象信息：\n\n${textOutput}`;
    }
  }

  // 创建现代化的天气信息HTML
  function createModernWeatherHTML(
    icao: string,
    metar: string,
    taf: string,
    parsedMETAR: ParsedMETAR,
    airportInfo: AirportInfo,
    runways: RunwayInfo[],
    runwayWindComponents: any[],
    flightRules: string,
    config: Config,
    sunTimes: SunTimes
  ): string {
    const airportName = airportInfo ? airportInfo.cnName : `${icao} Airport`;
    const windDirection = parseInt(parsedMETAR.windDirection) || 0;
    const windSpeed = parseInt(parsedMETAR.windSpeed) || 0;
    const temperature = parsedMETAR.temperature || 'N/A';
    const dewpoint = parsedMETAR.dewpoint || 'N/A';
    const pressure = parsedMETAR.pressure || 'N/A';
    const visibility = parsedMETAR.visibility || 'N/A';
    
    // 计算相对湿度
    const humidity = calculateHumidity(parseInt(temperature), parseInt(dewpoint));
    
    // 获取当前时间
    const now = new Date();
    const localTime = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const localDate = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // 生成跑道选择器 - 按逆风优先排序
    const runwaySelector = generateModernRunwaySelector(runways, runwayWindComponents);
    
    // 生成云层信息 - 使用映射表翻译
    const cloudInfo = generateModernCloudInfo(parsedMETAR.clouds, config);
    
    // 生成跑道表格
    const runwayTable = generateModernRunwayTable(runwayWindComponents);
    
    // 生成现代化的罗盘 - 修复风向标志
    const modernCompass = generateModernCompass(windDirection, windSpeed, runways, runwayWindComponents);
    
    // 获取天气图标 - 使用映射表翻译
    const weatherIcon = getModernWeatherIcon(parsedMETAR.weather, parsedMETAR.clouds, config);

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>METAR ${icao}</title>
    <style>
        ${getModernCSS()}
    </style>
</head>
<body>
    <div class="weather-container">
        <!-- 顶部导航 -->
        <nav class="top-nav">
            <div class="nav-breadcrumb">
                <a href="javascript:void(0)">国家</a>
                <span class="separator">›</span>
                <a href="javascript:void(0)">${getFIRRegion(icao)}</a>
                <span class="separator">›</span>
                <a href="javascript:void(0)">${getFIRRegion(icao)} 飞行情报区</a>
            </div>
        </nav>

        <!-- 标题区域 -->
        <div class="header-section">
            <div class="airport-title">
                <h1>🌤️ 机场 ${icao} 气象信息</h1>
                <h2>${airportName}</h2>
            </div>
            <div class="time-info">
                <div class="station-selector">
                    <span class="station-name">${icao}</span>
                </div>
                <div class="local-time">
                    <span class="date">${localDate}</span>
                    ${localTime} LT
                </div>
                <div class="observation-time">
                    <span class="time-ago">${getTimeAgo(parsedMETAR.time)}</span>
                </div>
            </div>
        </div>

        <!-- 指标卡片 -->
        <div class="metrics-grid">
            ${generateModernMetricCards(parsedMETAR, flightRules, humidity, config, sunTimes, weatherIcon)}
        </div>

        <div class="main-content">
            <div class="left-column">
                <!-- 罗盘区域 -->
                ${modernCompass}

                <!-- 机场观测 -->
                <div class="observation-section">
                    <h2>机场观测</h2>
                    <p>${generateModernObservationText(parsedMETAR, humidity, config)}</p>
                </div>

                <!-- 云层信息表格 -->
                ${cloudInfo}

                <!-- 跑道选择器 -->
                ${runwaySelector}
            </div>
            
            <div class="right-column">
                <!-- 云层剖面图 -->
                <div class="cloud-profile-section">
                    <h2>云层剖面</h2>
                    <div class="cloud-profile">
                        ${generateModernCloudProfile(parsedMETAR.clouds, config)}
                    </div>
                </div>
                
                <!-- METAR原始数据 -->
                <div class="raw-data-section">
                    <code>METAR ${metar}</code>
                    ${taf ? `<code class="taf-code">TAF ${taf}</code>` : ''}
                </div>

                <!-- 跑道信息表格 -->
                ${runwayTable}
                
                <!-- 温度天气表格 -->
                <div class="temperature-section">
                    <h2>温度 & 天气</h2>
                    <table class="data-table">
                        <tr>
                            <td>温度</td>
                            <td>${temperature} °C</td>
                        </tr>
                        <tr>
                            <td>露点</td>
                            <td>${dewpoint} °C</td>
                        </tr>
                        <tr>
                            <td>相对湿度</td>
                            <td>${humidity}%</td>
                        </tr>
                        <tr>
                            <td>气压</td>
                            <td>${pressure} ${parsedMETAR.pressureUnit || 'hPa'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  // 生成现代化的指标卡片
  function generateModernMetricCards(parsedMETAR: ParsedMETAR, flightRules: string, humidity: string, config: Config, sunTimes: SunTimes, weatherIcon: string): string {
    const temperature = parsedMETAR.temperature || 'N/A';
    const windSpeed = parsedMETAR.windSpeed || '0';
    const windDirection = parsedMETAR.windDirection || '0';
    const visibility = parsedMETAR.visibility || 'N/A';
    const pressure = parsedMETAR.pressure || 'N/A';
    
    // 飞行规则对应的CSS类和背景颜色
    const flightRuleClass = flightRules.toLowerCase();
    const flightRuleColors = {
      'vfr': { bg: 'rgba(40, 167, 69, 0.6)', color: '#28a745' },
      'mvfr': { bg: 'rgba(23, 162, 184, 0.6)', color: '#17a2b8' },
      'ifr': { bg: 'rgba(255, 193, 7, 0.6)', color: '#ffc107' },
      'lifr': { bg: 'rgba(220, 53, 69, 0.6)', color: '#dc3545' }
    };
    
    const flightRuleStyle = flightRuleColors[flightRuleClass] || flightRuleColors['vfr'];
    
    // 获取天气描述 - 使用映射表翻译
    const weatherDescription = getWeatherDescription(parsedMETAR.weather, config);

    return `
    <div class="metric-card">
        <div class="metric-value" style="color: ${flightRuleStyle.color}">${flightRules}</div>
        <div class="metric-header" style="background: ${flightRuleStyle.bg}">
            <div class="metric-label">${getWarnings(parsedMETAR, config)}</div>
        </div>
    </div>

    <div class="metric-card">
        <div class="weather-metric">
            <div class="weather-info">
                <div class="metric-value">${temperature}°C</div>
                <div class="metric-label">${weatherDescription}</div>
            </div>
            <div class="weather-icon weather-icon-large">${weatherIcon}</div>
        </div>
    </div>

    <div class="metric-card">
        <div class="metric-value">${windSpeed} kt</div>
        <div class="metric-header" style="background: rgba(40, 167, 69, 0.6);">
            <div class="metric-label">${windDirection}°</div>
        </div>
    </div>

    <div class="metric-card">
        <div class="metric-value">${visibility}</div>
        <div class="metric-header" style="background: rgba(40, 167, 69, 0.6);">
            <div class="metric-label">能见度</div>
        </div>
    </div>

    <div class="metric-card">
        <div class="metric-value">${getCeiling(parsedMETAR.clouds)}</div>
        <div class="metric-header" style="background: rgba(40, 167, 69, 0.6);">
            <div class="metric-label">云底高度</div>
        </div>
    </div>

    <div class="metric-card">
        <div class="metric-value">${pressure}</div>
        <div class="metric-header" style="background: rgba(42, 109, 161, 0.6);">
            <div class="metric-label">${parsedMETAR.pressureUnit || '气压'}</div>
        </div>
    </div>`;
  }

  // 修改CSS样式以支持新的布局 - 固定跑道和云层剖面大小
  function getModernCSS(): string {
    return `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        background: linear-gradient(135deg, #1a4b6d 0%, #0d3a5c 100%);
        color: #ffffff;
        line-height: 1.6;
    }

    .weather-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 20px;
    }

    /* 顶部导航 */
    .top-nav {
        margin-bottom: 20px;
    }

    .nav-breadcrumb {
        display: flex;
        align-items: center;
        font-size: 14px;
    }

    .nav-breadcrumb a {
        color: #ffffff;
        text-decoration: none;
        opacity: 0.8;
        transition: opacity 0.2s;
    }

    .nav-breadcrumb a:hover {
        opacity: 1;
        text-decoration: underline;
    }

    .separator {
        margin: 0 8px;
        opacity: 0.6;
    }

    /* 标题区域 */
    .header-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        flex-wrap: wrap;
        gap: 20px;
    }

    .airport-title h1 {
        font-size: 28px;
        font-weight: 600;
        margin: 0;
    }

    .airport-title h2 {
        font-size: 18px;
        font-weight: 400;
        margin: 5px 0 0 0;
        opacity: 0.8;
    }

    .time-info {
        display: flex;
        background: rgba(13, 58, 92, 0.8);
        border-radius: 8px;
        overflow: hidden;
    }

    .station-selector,
    .local-time,
    .observation-time {
        padding: 12px 20px;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
    }

    .station-selector:last-child,
    .local-time:last-child,
    .observation-time:last-child {
        border-right: none;
    }

    .station-name {
        font-weight: 600;
    }

    .local-time .date {
        margin-right: 8px;
        opacity: 0.8;
    }

    .observation-time {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    /* 指标卡片网格 */
    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 30px;
    }

    .metric-card {
        background: rgba(13, 58, 92, 0.8);
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        transition: transform 0.2s, background 0.2s;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 140px;
    }

    .metric-card:hover {
        transform: translateY(-2px);
        background: rgba(13, 58, 92, 1);
    }

    /* metric值在上，header在下 */
    .metric-value {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 8px;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .metric-header {
        background: rgba(42, 109, 161, 0.6);
        margin: -20px -20px -20px -20px;
        padding: 12px;
        border-radius: 0 0 12px 12px;
        margin-top: auto;
    }

    .metric-label {
        font-size: 14px;
        opacity: 0.9;
    }

    .weather-metric {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex: 1;
    }

    .weather-icon {
        font-size: 40px;
        margin-left: 15px;
    }

    .weather-info {
        flex: 1;
        text-align: left;
    }

    /* 主要内容区域 */
    .main-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-bottom: 30px;
    }

    /* 机场标题 */
    .airport-header {
        margin-bottom: 20px;
    }

    .airport-header h2 {
        font-size: 22px;
        font-weight: 600;
        margin: 0;
        color: #ffffff;
    }

    /* 罗盘和风速指示器布局 - 固定大小 */
    .compass-and-wind {
        display: flex;
        gap: 20px;
        align-items: flex-start;
        height: 320px; /* 固定高度 */
    }

    .compass-section {
        flex: 1;
        min-width: 0;
        height: 100%; /* 固定高度 */
    }

    .wind-speed-indicator {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-top: 20px;
        margin-left: -100px; /* 向左移动100px */
        height: 100%; /* 固定高度 */
    }

    /* 修复罗盘显示不全问题 - 固定大小 */
    .compass-container {
        background: rgba(13, 58, 92, 0.8);
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 20px;
        width: 100%;
        height: 420px; /* 固定高度 */
        box-sizing: border-box;
    }

    .compass-container h3 {
        margin-bottom: 12px;
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
        text-align: center;
    }

    .compass-wrapper {
        position: relative;
        width: 100%;
        height: 250px; /* 固定高度 */
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .compass-svg {
        width: 100%;
        height: 100%;
        max-width: 250px; /* 固定最大宽度 */
        max-height: 250px; /* 固定最大高度 */
    }

    .wind-info {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 12px;
        text-align: center;
        margin-top: 10px;
    }

    /* 风速指示器样式 - 固定大小 */
    .wind-speed-container {
        width: 90%;
        height: 250px; /* 固定高度 */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .wind-speed-container h4 {
        margin-bottom: 12px;
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
        text-align: center;
    }

    .wind-speed-gauge {
        position: relative;
        width: 100%;
        height: 200px; /* 固定高度 */
        margin-bottom: 10px;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .wind-speed-dial {
        width: 100%;
        height: 100%;
        max-width: 400px; /* 固定最大宽度 */
    }

    .wind-speed-pointer {
        position: absolute;
        top: 0;
        left: 150px;
        width: 100%;
        height: 100%;
        transform-origin: 80% 50%;
        transition: transform 0.5s ease;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    /* 修改风速指针位置 */
    .wind-pointer {
        width: 80%;
        right:200px;
        height: 80%;
        transform: translate(calc(-20% + 42px), 50px);
}
    }

    .wind-speed-value {
        text-align: center;
        font-size: 14px;
        color: #ffffff;
        padding: 8px;
        background: rgba(42, 109, 161, 0.3);
        border-radius: 6px;
        margin-top: 10px;
    }

    .wind-speed-value strong {
        color: #4cb3a4;
    }

    /* 跑道选择器 */
    .runway-selector {
        display: flex;
        gap: 15px;
        overflow-x: auto;
        padding: 10px 0;
        margin-bottom: 20px;
    }

    .runway-option {
        background: rgba(42, 109, 161, 0.6);
        padding: 10px 12px;
        border-radius: 8px;
        white-space: nowrap;
        cursor: pointer;
        transition: background 0.2s;
        border: 2px solid transparent;
        min-width: 120px;
        text-align: center;
    }

    .runway-option.active {
        background: rgba(76, 179, 164, 0.8);
        border-color: #4cb3a4;
    }

    .runway-option:hover {
        background: rgba(42, 109, 161, 0.8);
    }

    /* 跑道SVG样式 */
    .runway-svg {
        width: 100%;
        height: auto;
        max-width: 200px;
        margin: 5px 0;
    }

    /* 表格样式 */
    .data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
    }

    .data-table td {
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .data-table td:first-child {
        width: 40%;
        background: rgba(42, 109, 161, 0.3);
    }

    /* 原始数据区域 */
    .raw-data-section {
        background: rgba(13, 58, 92, 0.8);
        border-radius: 8px;
        padding: 15px;
        margin: 20px 0;
    }

    .raw-data-section code {
        font-family: 'Courier New', monospace;
        color: #ffffff;
        display: block;
        line-height: 1.4;
    }

    .taf-code {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* 云层剖面图 - 固定大小 */
    .cloud-profile-section {
        margin: 20px 0;
        height: 350px; /* 固定高度 */
    }

    .cloud-profile-section h2 {
        margin-bottom: 15px;
        font-size: 22px;
        font-weight: 600;
    }

    .cloud-profile {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        padding: 20px;
        height: 300px; /* 固定高度 */
        position: relative;
    }

    .position-relative {
        position: relative;
    }

    .w-100 {
        width: 100%;
    }

    .h-100 {
        height: 100%;
    }

    .left-top {
        left: 0;
        top: 0;
    }

    .position-absolute {
        position: absolute;
    }

    .d-flex {
        display: flex;
    }

    .small {
        font-size: 12px;
    }

    .rounded {
        border-radius: 8px;
    }

    .border {
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .bg-primary {
        background: rgba(42, 109, 161, 0.8);
    }

    .py-1 {
        padding-top: 0.25rem;
        padding-bottom: 0.25rem;
    }

    .px-2 {
        padding-left: 0.5rem;
        padding-right: 0.5rem;
    }

    .d-block {
        display: block;
    }

    .m-auto {
        margin: auto;
    }

    .text-center {
        text-align: center;
    }

    .text-white {
        color: white;
    }

    .mb-0 {
        margin-bottom: 0;
    }

    .overflow-hidden {
        overflow: hidden;
    }

    /* 观测区域 */
    .observation-section {
        margin-top: 20px;
    }

    .observation-section h2 {
        margin-bottom: 15px;
        font-size: 22px;
        font-weight: 600;
    }

    .observation-section p {
        line-height: 1.6;
        opacity: 0.9;
    }

    /* 响应式设计 */
    @media (max-width: 768px) {
        .main-content {
            grid-template-columns: 1fr;
        }
        
        .metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        }
        
        .header-section {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .time-info {
            width: 100%;
            justify-content: space-between;
        }
        
        .compass-and-wind {
            flex-direction: column;
            height: auto; /* 移动端取消固定高度 */
        }
        
        .compass-section,
        .wind-speed-indicator {
            width: 100%;
            height: 300px; /* 移动端固定高度 */
        }
        
        .compass-wrapper {
            height: 250px;
        }
        
        .wind-speed-gauge {
            height: 300px;
        }
        
        .runway-selector {
            flex-wrap: wrap;
        }
        
        .runway-option {
            min-width: 100px;
        }
        
        /* 移动端恢复风速指示器位置 */
        .wind-speed-indicator {
            margin-left: 0;
        }
        
        /* 移动端云层剖面图高度调整 */
        .cloud-profile-section {
            height: 300px;
        }
        
        .cloud-profile {
            height: 250px;
        }
    }

    /* 辅助文本 */
    .help-text {
        font-size: 12px;
        opacity: 0.7;
        margin-top: 5px;
    }

    /* 白天时段信息 */
    .daylight-info {
        margin-top: 20px;
    }

    .daylight-info h2 {
        margin-bottom: 15px;
        font-size: 22px;
        font-weight: 600;
    }
  `;
  }

  // 生成现代化的罗盘组件 - 固定大小
  function generateModernCompass(windDirection: number, windSpeed: number, runways: RunwayInfo[], runwayWindComponents: any[]): string {
    if (runways.length === 0) return '';
    
    // 使用逆风分量最大的跑道作为示例
    const bestRunway = runwayWindComponents.length > 0 ? runwayWindComponents[0].runway : runways[0];
    const heading = parseInt(bestRunway.leHeadingDegt) || 0;
    
    return `
    <div class="compass-container">
        <h3>跑道 ${bestRunway.leIdent}/${bestRunway.heIdent} 风向示意图</h3>
        <div class="compass-and-wind">
            <div class="compass-section">
                <div class="compass-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" class="compass-svg">
                        <defs>
                            <radialGradient id="compass_bg" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                                <stop offset="0%" style="stop-color:rgb(240,240,240); stop-opacity:0.8"/>
                                <stop offset="100%" style="stop-color:rgb(225,225,225); stop-opacity:0.9"/>
                            </radialGradient>
                        </defs>
                        
                        <!-- 背景圆和刻度 -->
                        <circle cx="150" cy="150" r="145" fill="#2a6da1" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
                        <circle cx="150" cy="150" r="125" fill="#f7fafc" stroke="#e2e8f0" stroke-width="1" style="fill:url(#compass_bg)"/>
                        
                        <!-- 方向刻度 -->
                        ${generateDirectionTicks()}
                        
                        <!-- 跑道线条 - 使用与runway-selector相同的格式 -->
                        <g transform="rotate(${heading}, 150, 150)">
                            <!-- 跑道主体 -->
                            <line x1="150" y1="40" x2="150" y2="260" 
                                  style="stroke:#718096;stroke-width:20;stroke-linecap:round"/>
                            <!-- 跑道中心线 -->
                            <line x1="150" y1="40" x2="150" y2="260" 
                                  style="stroke:#cbd5e0;stroke-width:2;stroke-dasharray:10,5;stroke-linecap:round"/>
                            <!-- 跑道编号 -->
                            <text x="150" y="30" text-anchor="middle" font-size="23" fill="#fff" font-weight="bold">${bestRunway.leIdent}</text>
                            <text x="150" y="280" text-anchor="middle" font-size="23" fill="#fff" font-weight="bold">${bestRunway.heIdent}</text>
                        </g>
                        
                        <!-- 风向箭头 - 修复旋转中心 -->
                        <g transform="rotate(${windDirection}, 150, 150)">
                            <line x1="150" y1="150" x2="150" y2="40" stroke="#e53e3e" stroke-width="3"/>
                            <path d="M150 40 L145 30 L155 30 Z" fill="#e53e3e"/>
                        </g>
                        
                        <!-- 中心点 -->
                        <circle cx="150" cy="150" r="3" fill="#e53e3e"/>
                    </svg>
                </div>
                <div class="wind-info">
                    <div style="display: inline-block; margin: 0 15px;">
                        <span style="font-size: 11px; opacity: 0.8;">风向</span>
                        <div style="font-size: 14px; font-weight: 600;">${windDirection}°</div>
                    </div>
                    <div style="display: inline-block; margin: 0 15px;">
                        <span style="font-size: 11px; opacity: 0.8;">风速</span>
                        <div style="font-size: 14px; font-weight: 600;">${windSpeed} kt</div>
                    </div>
                </div>
            </div>
            
            <div class="wind-speed-indicator">
                ${generateWindSpeedIndicator(windSpeed)}
            </div>
        </div>
    </div>`;
  }

  // 生成方向刻度
  function generateDirectionTicks(): string {
    let directionTicks = '';
    for (let i = 0; i < 36; i++) {
      const tickAngle = (i * 10 * Math.PI) / 180;
      const tickLength = i % 3 === 0 ? 8 : 4;
      const tickX1 = 150 + Math.sin(tickAngle) * 125;
      const tickY1 = 150 - Math.cos(tickAngle) * 125;
      const tickX2 = 150 + Math.sin(tickAngle) * (125 + tickLength);
      const tickY2 = 150 - Math.cos(tickAngle) * (125 + tickLength);
      
      directionTicks += `<line x1="${tickX1}" y1="${tickY1}" x2="${tickX2}" y2="${tickY2}" 
                            stroke="#4a5568" stroke-width="${i % 3 === 0 ? 2 : 1}" />`;
      
      if (i % 3 === 0) {
        const labelAngle = i * 10;
        const labelX = 150 + Math.sin(tickAngle) * 110;
        const labelY = 150 - Math.cos(tickAngle) * 110;
        let labelText = '';
        
        if (labelAngle === 0) labelText = 'N';
        else if (labelAngle === 90) labelText = 'E';
        else if (labelAngle === 180) labelText = 'S';
        else if (labelAngle === 270) labelText = 'W';
        else labelText = (labelAngle / 10).toString();
        
        directionTicks += `<text x="${labelX}" y="${labelY}" font-size="10" text-anchor="middle" 
                                fill="#ffffff" font-weight="bold">${labelText}</text>`;
      }
    }
    return directionTicks;
  }

  // 生成风速指示器
  function generateWindSpeedIndicator(windSpeed: number): string {
    // 计算指针旋转角度 (0-45kt对应0-270度)
    const maxSpeed = 45;
    const rotation = Math.min(windSpeed, maxSpeed) / maxSpeed * 270;
    
    return `
    <div class="wind-speed-container">
        <h4>风速指示器</h4>
        <div class="wind-speed-gauge">
            <!-- 风速表盘 -->
            <svg xmlns="http://www.w3.org/2000/svg" enable-background="new" version="1.1" viewBox="0 0 539.97 299.99" class="wind-speed-dial"><path d="m470.76 1.2116 1.0566 12.189a137.28 137.28 0 0 1 0.0215-2e-3zm-25.641 4.5293 3.1289 11.711a137.28 137.28 0 0 1 0.0176-0.0078zm-24.469 8.9102 5.1504 11.059a137.28 137.28 0 0 1 0.0176-0.0059zm-22.547 13.021 7.0234 10.047a137.28 137.28 0 0 1 0.0176-0.01367zm-19.953 16.738 8.6406 8.6543a137.28 137.28 0 0 1 0.0137-0.01563zm-16.721 19.949 9.9141 6.9551a137.28 137.28 0 0 1 0.0117-0.02148zm-13.014 22.551 11.062 5.1699a137.28 137.28 0 0 1 0.01-0.01953zm-8.8965 24.473 11.842 3.1797a137.28 137.28 0 0 1 6e-3 -0.0215zm-4.5215 25.639 12.121 1.0684a137.28 137.28 0 0 1 2e-3 -0.0215zm12.188 24.959-12.188 1.0801 12.189-1.0566a137.28 137.28 0 0 1-2e-3 -0.0234zm4.0527 23.57-11.709 3.1523 11.715-3.1309a137.28 137.28 0 0 1-6e-3 -0.0215zm8.2656 22.449-11.049 5.168 11.061-5.1465a137.28 137.28 0 0 1-0.0117-0.0215zm11.998 20.672-10.031 7.041 10.043-7.0234a137.28 137.28 0 0 1-0.0117-0.0176zm15.34 18.328-8.6328 8.6562 8.6484-8.6426a137.28 137.28 0 0 1-0.0137-0.0137zm18.25 15.465-6.9356 9.9258 6.9551-9.916a137.28 137.28 0 0 1-0.0195-0.01zm20.762 11.869-5.1445 11.068 5.1641-11.059a137.28 137.28 0 0 1-0.0195-0.01zm22.48 8.127-3.1602 11.844 3.1797-11.842a137.28 137.28 0 0 1-0.0195-2e-3zm23.551 4.2363a137.28 137.28 0 0 1-0.0215 2e-3l-1.0469 12.123z" fill="#fffbfb" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".19854"/><path d="m483.78 0.62566-0.0137 16.553a132.85 132.85 0 0 1 0.0312-2e-3zm-25.939 2.2734 2.877 16.379a132.85 132.85 0 0 1 0.0274-0.0039zm-25.15 6.7422 5.6953 15.684a132.85 132.85 0 0 1 0.0312-0.01172zm-23.598 11.01 8.3184 14.43a132.85 132.85 0 0 1 0.0293-0.01563zm-21.33 14.938 10.625 12.676a132.85 132.85 0 0 1 0.0215-0.01758zm-18.412 18.412 12.736 10.705a132.85 132.85 0 0 1 0.0176-0.02344zm-14.93 21.332 14.445 8.3516a132.85 132.85 0 0 1 0.0137-0.02539zm-10.982 23.598 15.594 5.6895a132.85 132.85 0 0 1 8e-3 -0.0293zm-6.7324 25.154 16.408 2.9023a132.85 132.85 0 0 1 6e-3 -0.0273zm14.271 25.92-16.551 0.0176 16.555 0.01a132.85 132.85 0 0 1-4e-3 -0.0273zm2.0879 23.045-16.371 2.9082 16.377-2.875a132.85 132.85 0 0 1-6e-3 -0.0332zm6.043 22.336-15.672 5.7207 15.684-5.6953a132.85 132.85 0 0 1-0.0117-0.0254zm9.752 20.973-14.414 8.3418 14.432-8.3184a132.85 132.85 0 0 1-0.0176-0.0234zm13.182 19.023-12.658 10.645 12.678-10.623a132.85 132.85 0 0 1-0.0195-0.0215zm16.436 16.295-10.682 12.756 10.701-12.736a132.85 132.85 0 0 1-0.0195-0.0195zm18.975 13.227-8.3262 14.459 8.3516-14.447a132.85 132.85 0 0 1-0.0254-0.0117zm20.936 9.8555-5.6621 15.605 5.6914-15.598a132.85 132.85 0 0 1-0.0293-8e-3zm22.365 5.9277-2.877 16.408 2.9062-16.402a132.85 132.85 0 0 1-0.0293-6e-3zm23.072 2.1211a132.85 132.85 0 0 1-0.0273 6e-3l0.0176 16.551z" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".19731"/><g fill="#fff" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-weight="300" letter-spacing="0px" stroke-width="6.0619" word-spacing="0px"><g fill-opacity=".50458"><g font-size="32.33px"><text transform="rotate(-.85)" x="387.58875" y="112.16953" enable-background="new" style="line-height:1.25" xml:space="preserve"><tspan x="387.58875" y="112.16953" fill="#ffffff" fill-opacity=".50458" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-weight="300" stroke-width="6.0619" text-align="center" text-anchor="middle">30</tspan></text><text transform="rotate(-.57)" x="393.76328" y="256.12094" enable-background="new" style="line-height:1.25" xml:space="preserve"><tspan x="393.76328" y="256.12094" fill="#ffffff" fill-opacity=".50458" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-weight="300" letter-spacing="-4.196px" stroke-width="6.0619">10</tspan></text><text transform="rotate(-.63)" x="354.72375" y="186.40331" enable-background="new" style="line-height:1.25" xml:space="preserve"><tspan x="354.72375" y="186.40331" fill="#ffffff" fill-opacity=".50458" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-weight="300" letter-spacing="-.94348px" stroke-width="6.0619">20</tspan></text><text transform="rotate(1.956)" x="429.66553" y="39.435848" enable-background="new" style="line-height:1.25" xml:space="preserve"><tspan x="429.66553" y="39.435848" fill="#ffffff" fill-opacity=".50458" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-weight="300" letter-spacing="-1.6883px" stroke-width="6.0619">40</tspan></text><text transform="rotate(-.57)" x="471.66229" y="282.04977" enable-background="new" style="line-height:1.25" xml:space="preserve"><tspan x="471.66229" y="282.04977" fill="#ffffff" fill-opacity=".50458" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-weight="300" letter-spacing="-4.196px" stroke-width="6.0619">0</tspan></text></g><g font-size="20.5px"><text transform="rotate(-.57)" x="434.14883" y="273.78049" enable-background="new" style="line-height:1.25" xml:space="preserve"><tspan x="434.14883" y="273.78049" fill="#ffffff" fill-opacity=".50458" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-weight="300" letter-spacing="-2.6606px" stroke-width="6.0619">5</tspan></text><text transform="rotate(-.57)" x="368.87915" y="223.67068" enable-background="new" style="line-height:1.25" xml:space="preserve"><tspan x="368.87915" y="223.67068" fill="#ffffff" fill-opacity=".50458" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-weight="300" letter-spacing="-2.6606px" stroke-width="6.0619">15</tspan></text><text transform="rotate(-.57)" x="356.20081" y="140.87766" enable-background="new" style="line-height:1.25" xml:space="preserve"><tspan x="356.20081" y="140.87766" fill="#ffffff" fill-opacity=".50458" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-weight="300" letter-spacing="-2.6606px" stroke-width="6.0619">25</tspan></text><text transform="rotate(-.57)" x="397.78909" y="71.381081" enable-background="new" style="line-height:1.25" xml:space="preserve"><tspan x="397.78909" y="71.381081" fill="#ffffff" fill-opacity=".50458" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-weight="300" letter-spacing="-2.6606px" stroke-width="6.0619">35</tspan></text><text transform="rotate(-.57)" x="474.15717" y="42.222847" enable-background="new" style="line-height:1.25" xml:space="preserve"><tspan x="474.15717" y="42.222847" fill="#ffffff" fill-opacity=".50458" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-weight="300" letter-spacing="-2.6606px" stroke-width="6.0619">45</tspan></text></g></g><text transform="rotate(.49611)" x="513.96155" y="86.496727" enable-background="new" fill-opacity=".50087" font-size="25.105px" text-align="end" text-anchor="end" style="line-height:1.25" xml:space="preserve"><tspan x="494.27924" y="86.496727" fill="#ffffff" fill-opacity=".50087" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-weight="300" stroke-width="6.0619" text-align="end" text-anchor="end">kt</tspan></text></g></svg>
            
            <!-- 风速指针 - 修复位置问题，将指针圆点固定在右侧中心 -->
            <div class="wind-speed-pointer" style="transform: rotate(${rotation}deg);">
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" enable-background="new" version="1.1" viewBox="0 0 299.2 299.2" class="wind-pointer"><defs><filter id="filter2127" x="-.00055999" y="-.00052769" width="1.0179" height="1.0169" color-interpolation-filters="sRGB"><feFlood flood-color="rgb(0,0,0)" flood-opacity=".49804" result="flood"/><feComposite in="flood" in2="SourceGraphic" operator="in" result="composite1"/><feGaussianBlur in="composite1" result="blur" stdDeviation="0.0013910235"/><feOffset dx="0.1" dy="0.1" result="offset"/><feComposite in="SourceGraphic" in2="offset" result="composite2"/></filter><filter id="filter2115" x="-.1403" y="-.13221" width="1.3098" height="1.292" color-interpolation-filters="sRGB"><feFlood flood-color="rgb(0,0,0)" flood-opacity=".49804" result="flood"/><feComposite in="flood" in2="SourceGraphic" operator="out" result="composite1"/><feGaussianBlur in="composite1" result="blur" stdDeviation="0.2"/><feOffset dx="0.1" dy="0.1" result="offset"/><feComposite in="offset" in2="SourceGraphic" operator="atop" result="composite2"/></filter><filter id="filter1350" x="-.21917" y="-.024537" width="1.4916" height="1.055" color-interpolation-filters="sRGB"><feFlood flood-color="rgb(0,0,0)" flood-opacity=".49804" result="flood"/><feComposite in="flood" in2="SourceGraphic" operator="in" result="composite1"/><feGaussianBlur in="composite1" result="blur" stdDeviation="1.2"/><feOffset dx="0.7" dy="0.7" result="offset"/><feComposite in="SourceGraphic" in2="offset" result="composite2"/></filter><filter id="filter1362" x="-.14724" y="-.061731" width="1.3303" height="1.1385" color-interpolation-filters="sRGB"><feFlood flood-color="rgb(0,0,0)" flood-opacity=".49804" result="flood"/><feComposite in="flood" in2="SourceGraphic" operator="in" result="composite1"/><feGaussianBlur in="composite1" result="blur" stdDeviation="1.2"/><feOffset dx="0.7" dy="0.7" result="offset"/><feComposite in="SourceGraphic" in2="offset" result="composite2"/></filter></defs><path d="m143.07 147.7 0.15234 99.02 6.543 18.352 6.4453-18.385-0.13476-98.986z" fill="#fff" filter="url(#filter1350)"/><path d="m149.51 101.24a9.7799 9.7799 0 0 0-9.6699 9.7793 9.7799 9.7799 0 0 0 3.4219 7.4316v29.443h12.691l0.084-29.494a9.7799 9.7799 0 0 0 3.3633-7.3809 9.7799 9.7799 0 0 0-9.7793-9.7793 9.7799 9.7799 0 0 0-0.11133 0z" fill="#262626" filter="url(#filter1362)"/><text x="-247.21579" y="119.75312" fill="#ffffff" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-size="19.863px" font-weight="300" letter-spacing="0px" stroke-width="2.4828" word-spacing="0px" style="line-height:1.25" xml:space="preserve"><tspan x="-247.21579" y="138.13974" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-size="13.242px" font-weight="300" stroke-width="2.4828" style="line-height:0"/></text><g transform="translate(-446.92 140.23)" opacity=".99"><text x="13.86202" y="253.8631" fill="#000000" font-family="'-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif" font-size="5.3333px" font-weight="300" letter-spacing="0px" word-spacing="0px" style="line-height:1.25" xml:space="preserve"><tspan x="13.86202" y="258.80008"/></text></g><ellipse transform="matrix(-3.1841 .0099951 -.0099951 -3.1841 414.71 466.99)" cx="82.948" cy="99.94" rx="2.9808" ry="3.1633" enable-background="new" fill="#262626" filter="url(#filter2127)"/><ellipse transform="matrix(-3.1841 .0099951 -.0099951 -3.1841 414.71 466.99)" cx="82.948" cy="99.94" rx="1.7106" ry="1.8153" enable-background="new" fill="#262626" filter="url(#filter2115)"/></svg>
            </div>
        </div>
        <div class="wind-speed-value">
            当前风速: <strong>${windSpeed} kt</strong>
        </div>
    </div>`;
  }

  // 生成现代化的跑道选择器 - 按逆风优先排序
  function generateModernRunwaySelector(runways: RunwayInfo[], runwayWindComponents: any[]): string {
    if (runways.length === 0) return '';
    
    return `
      <div class="runway-selector">
          ${runwayWindComponents.map((item, index) => {
            const runway = item.runway;
            const components = item.components;
            const isActive = index === 0;
            return `
              <div class="runway-option ${isActive ? 'active' : ''}" data-index="${index}">
                  <div class="runway-svg">
                      ${generateRunaySVG(runway.leIdent, runway.heIdent)}
                  </div>
                  <div class="help-text">顶风: ${components.headwind.toFixed(1)} kt</div>
                  <div class="help-text">侧风: ${components.crosswind.toFixed(1)} kt</div>
              </div>
            `;
          }).join('')}
      </div>`;
  }

  // 跑道SVG生成函数
  function generateRunaySVG(leIdent: string, heIdent: string): string {
    // 跑道尺寸参数
    const runwayLength = 480; // 跑道长度（垂直方向）
    const runwayWidth = 65;   // 跑道宽度（水平方向）
    const centerLineWidth = 4; // 中心线宽度
    const centerLineLength = 10; // 中心线每段长度
    const centerLineGap = 8; // 中心线间隔
    const thresholdLineWidth = 6; // 跑道入口线宽度（竖线）
    const thresholdLineLength = 20; // 跑道入口线长度
    const thresholdLineSpacing = 8; // 跑道入口线间距
    const fontSize = 16; // 跑道编号字体大小
    
    // SVG尺寸
    const svgWidth = 230;
    const svgHeight = 530;
    
    // 计算居中位置
    const centerX = svgWidth / 2 - 55;
    const centerY = svgHeight / 2;
    const runwayStartY = centerY - runwayLength / 2;
    const runwayEndY = centerY + runwayLength / 2;
    const runwayStartX = centerX - runwayWidth / 2 ;
    const runwayEndX = centerX + runwayWidth / 2 ;
    
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
          <!-- 跑道主体 -->
          <rect x="${runwayStartX}" y="${runwayStartY}" 
                width="${runwayWidth}" height="${runwayLength}" 
                fill="#2a6da1" stroke="#fff" stroke-width="1"/>
          
          <!-- 跑道中心线 -->
          ${generateCenterLine(centerX, runwayStartY, runwayEndY -35, centerLineWidth, centerLineLength, centerLineGap)}
          
          <!-- 跑道入口标志线 - 顶部（竖线） -->
          ${generateThresholdLines(runwayStartX, runwayStartY, runwayWidth, thresholdLineWidth, thresholdLineLength, thresholdLineSpacing)}
          
          <!-- 跑道入口标志线 - 底部（竖线） -->
          ${generateThresholdLines(runwayStartX, runwayEndY - thresholdLineLength, runwayWidth, thresholdLineWidth, thresholdLineLength, thresholdLineSpacing)}
          
          <!-- 跑道编号 - 顶部（在入口线上方） -->
          <text x="${centerX}" y="${runwayStartY + 35}" 
                text-anchor="middle" dominant-baseline="middle"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                font-size="${fontSize}" font-weight="600" fill="#fff">
              ${leIdent}
          </text>
          
          <!-- 跑道编号 - 底部（在入口线上方） -->
          <text x="${centerX}" y="${runwayEndY - 35}" 
                text-anchor="middle" dominant-baseline="middle"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                font-size="${fontSize}" font-weight="600" fill="#fff">
              ${heIdent}
          </text>
      </svg>`;
  }

  // 生成跑道中心线
  function generateCenterLine(centerX: number, startY: number, endY: number, lineWidth: number, lineLength: number, gap: number): string {
    let lines = '';
    let y = startY + gap + 35;
    
    while (y + lineLength < endY) {
      lines += `<rect x="${centerX - lineWidth / 2}" y="${y}" 
                     width="${lineWidth}" height="${lineLength}" fill="#fff"/>`;
      y += lineLength + gap;
    }
    
    return lines;
  }

  // 生成跑道入口标志线（竖线）
  function generateThresholdLines(startX: number, y: number, runwayWidth: number, lineWidth: number, lineLength: number, spacing: number): string {
    let lines = '';
    const lineCount = Math.floor(runwayWidth / (lineWidth + spacing));
    const totalWidth = (lineWidth * lineCount) + (spacing * (lineCount - 1));
    const startLineX = startX + (runwayWidth - totalWidth) / 2;
    
    for (let i = 0; i < lineCount; i++) {
      const x = startLineX + i * (lineWidth + spacing);
      lines += `<rect x="${x}" y="${y}" 
                     width="${lineWidth}" height="${lineLength}" fill="#fff"/>`;
    }
    
    return lines;
  }

  // 生成现代化的云层剖面图 - 固定大小
  function generateModernCloudProfile(clouds: any[], config: Config): string {
    const cloudCondition = getCloudCondition(clouds, config);
    
    return `
    <div class="w-100 position-relative" style="height: 250px;">
        <svg class="w-100" viewBox="0 0 618 250" preserveAspectRatio="xMidYMid meet">
            <path stroke="#fff" stroke-opacity=".3" stroke-width="1" d="M80,249 L617,249"></path>
            <text font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif" style="font-size:18px;font-style:normal;font-variant:normal;font-weight:300;opacity:0.5;font-stretch:normal;text-anchor:end;text-align:end;fill:#ffffff;stroke-width:1" x="70" y="249">0 ft</text>
            <path stroke="#fff" stroke-opacity=".3" stroke-width="1" d="M80,207.5 L617,207.5"></path>
            <text font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif" style="font-size:18px;font-style:normal;font-variant:normal;font-weight:300;opacity:0.5;font-stretch:normal;text-anchor:end;text-align:end;fill:#ffffff;stroke-width:1" x="70" y="207.5">1,000 </text>
            <path stroke="#fff" stroke-opacity=".3" stroke-width="1" d="M80,166 L617,166"></path>
            <text font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif" style="font-size:18px;font-style:normal;font-variant:normal;font-weight:300;opacity:0.5;font-stretch:normal;text-anchor:end;text-align:end;fill:#ffffff;stroke-width:1" x="70" y="166">2,000 </text>
            <path stroke="#fff" stroke-opacity=".3" stroke-width="1" d="M80,124.5 L617,124.5"></path>
            <text font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif" style="font-size:18px;font-style:normal;font-variant:normal;font-weight:300;opacity:0.5;font-stretch:normal;text-anchor:end;text-align:end;fill:#ffffff;stroke-width:1" x="70" y="124.5">3,000 </text>
            <path stroke="#fff" stroke-opacity=".3" stroke-width="1" d="M80,83 L617,83"></path>
            <text font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif" style="font-size:18px;font-style:normal;font-variant:normal;font-weight:300;opacity:0.5;font-stretch:normal;text-anchor:end;text-align:end;fill:#ffffff;stroke-width:1" x="70" y="83">4,000 </text>
            <path stroke="#fff" stroke-opacity=".3" stroke-width="1" d="M80,41.5 L617,41.5"></path>
            <text font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif" style="font-size:18px;font-style:normal;font-variant:normal;font-weight:300;opacity:0.5;font-stretch:normal;text-anchor:end;text-align:end;fill:#ffffff;stroke-width:1" x="70" y="41.5">5,000 </text>
            <path stroke="#fff" stroke-opacity=".3" d="M80,249 L80,10"></path>
        </svg>
        <div class="position-absolute left-top w-100 h-100 overflow-hidden">
            <div class="position-absolute w-100 h-100 left-top d-flex" style="padding-left: 10%">
                <div class="small rounded border bg-primary py-1 px-2 rounded d-block m-auto text-center" style="max-width: 75%">
                    <h6 class="text-white mb-0">${cloudCondition}</h6>
                </div>
            </div>
        </div>
    </div>`;
  }

  // 获取云层状态描述 - 使用映射表翻译
  function getCloudCondition(clouds: any[], config: Config): string {
    if (clouds.length === 0) {
      return config.cloudCoverageMap.find(item => item.code === 'NSC')?.description || "无显著云层";
    }
    
    const hasOvercast = clouds.some(c => c.type === 'OVC');
    const hasBroken = clouds.some(c => c.type === 'BKN');
    const hasScattered = clouds.some(c => c.type === 'SCT');
    const hasFew = clouds.some(c => c.type === 'FEW');
    
    if (hasOvercast) return config.cloudCoverageMap.find(item => item.code === 'OVC')?.description || "满天云";
    if (hasBroken) return config.cloudCoverageMap.find(item => item.code === 'BKN')?.description || "多云";
    if (hasScattered) return config.cloudCoverageMap.find(item => item.code === 'SCT')?.description || "疏云";
    if (hasFew) return config.cloudCoverageMap.find(item => item.code === 'FEW')?.description || "少云";
    
    return "有云";
  }

  // 现代化的天气图标获取 - 使用映射表翻译
  function getModernWeatherIcon(weather: string[], clouds: any[], config: Config): string {
    // 首先检查是否有特殊天气现象
    if (weather.some(w => config.weatherMap.find(item => item.code === w)?.description.includes('雷暴'))) {
      return '⛈️';
    } else if (weather.some(w => config.weatherMap.find(item => item.code === w)?.description.includes('雨'))) {
      return '🌧️';
    } else if (weather.some(w => config.weatherMap.find(item => item.code === w)?.description.includes('雪'))) {
      return '❄️';
    } else if (weather.some(w => config.weatherMap.find(item => item.code === w)?.description.includes('雾'))) {
      return '🌫️';
    }
    
    // 然后根据云量决定
    if (clouds.some(c => c.type === 'OVC')) {
      return '☁️';
    } else if (clouds.some(c => c.type === 'BKN')) {
      return '🌤️';
    } else if (clouds.some(c => c.type === 'SCT') || clouds.some(c => c.type === 'FEW')) {
      return '⛅';
    } else {
      return '☀️';
    }
  }

  // 现代化的观测文本生成 - 使用映射表翻译
  function generateModernObservationText(parsedMETAR: ParsedMETAR, humidity: string, config: Config): string {
    const windText = parsedMETAR.windDirection === 'VRB' ? 
      `风向多变，风速 ${parsedMETAR.windSpeed} ${parsedMETAR.windUnit}` :
      `风向 ${parsedMETAR.windDirection}°，风速 ${parsedMETAR.windSpeed} ${parsedMETAR.windUnit}`;
    
    // 翻译云层
    const cloudDescriptions = parsedMETAR.clouds.map(cloud => {
      const cloudDesc = config.cloudCoverageMap.find(item => item.code === cloud.type)?.description || cloud.type;
      return `${cloudDesc} ${cloud.height}英尺`;
    });
    const cloudText = cloudDescriptions.length > 0 ? `云量：${cloudDescriptions.join('，')}` : '无显著云层';

    // 翻译天气现象
    const weatherDescriptions = parsedMETAR.weather.map(code => {
      return config.weatherMap.find(item => item.code === code)?.description || code;
    });
    const weatherText = weatherDescriptions.length > 0 ? `天气现象：${weatherDescriptions.join('，')}` : '';

    return `
    风向 ${windText}。
    能见度 ${parsedMETAR.visibility} 米。
    ${cloudText}。
    ${weatherText}
    温度和风寒指数为 ${parsedMETAR.temperature} °C。
    露点温度为 ${parsedMETAR.dewpoint} °C，相对湿度为 ${humidity}%。
    海平面气压为 ${parsedMETAR.pressure} ${parsedMETAR.pressureUnit}。
  `.replace(/\s+/g, ' ').trim();
  }

  // 生成现代化的云层信息 - 使用映射表翻译
  function generateModernCloudInfo(clouds: any[], config: Config): string {
    if (clouds.length === 0) {
      const noCloudDescription = config.cloudCoverageMap.find(item => item.code === 'NSC')?.description || '无显著云层';
      return `
      <div class="cloud-section">
        <h2>云层</h2>
        <table class="data-table">
            <tr>
                <td>${noCloudDescription}</td>
                <td>NSC</td>
                <td>${noCloudDescription}</td>
            </tr>
        </table>
      </div>`;
    }
    
    return `
    <div class="cloud-section">
        <h2>云层</h2>
        <table class="data-table">
            ${clouds.map(cloud => {
              const description = config.cloudCoverageMap.find(item => item.code === cloud.type)?.description || cloud.type;
              return `
                <tr>
                    <td>${cloud.height} ft</td>
                    <td>${cloud.type}</td>
                    <td>${description}</td>
                </tr>
              `;
            }).join('')}
        </table>
    </div>`;
  }

  // 生成现代化的跑道表格
  function generateModernRunwayTable(runwayWindComponents: any[]): string {
    if (runwayWindComponents.length === 0) return '';
    
    return `
    <div class="runway-section">
        <h2>跑道</h2>
        <div style="overflow-x: auto;">
            <table class="data-table">
                <tr>
                    <td><strong>编号</strong></td>
                    <td><strong>航向</strong></td>
                    <td><strong>侧风</strong></td>
                    <td><strong>顶风</strong></td>
                    <td><strong>侧风百分比</strong></td>
                </tr>
                ${runwayWindComponents.map(item => {
                  const runway = item.runway;
                  const components = item.components;
                  const crosswindPercent = Math.round((components.crosswind / (parseInt(components.headwind) || 1)) * 100);
                  
                  return `
                    <tr>
                        <td><strong>${runway.leIdent}/${runway.heIdent}</strong></td>
                        <td>${runway.leHeadingDegt}°-${runway.heHeadingDegt}°</td>
                        <td>${components.crosswind.toFixed(1)} kt</td>
                        <td>${components.headwind.toFixed(1)} kt</td>
                        <td>${crosswindPercent}%</td>
                    </tr>
                  `;
                }).join('')}
            </table>
        </div>
        <p class="help-text">按逆风分量排序，最大顶风分量的跑道已高亮显示，用于侧风计算。</p>
    </div>`;
  }

  // 获取天气描述 - 使用映射表翻译
  function getWeatherDescription(weather: string[], config: Config): string {
    if (weather.length === 0) return '晴朗';
    const descriptions = weather.map(code => {
      const found = config.weatherMap.find(item => item.code === code);
      return found ? found.description : code;
    });
    return descriptions.join('，') || '天气良好';
  }

  // 获取警告信息 - 使用映射表翻译
  function getWarnings(parsedMETAR: ParsedMETAR, config: Config): string {
    const warningWeather = parsedMETAR.weather.filter(w => {
      const description = config.weatherMap.find(item => item.code === w)?.description || '';
      return description.includes('雷暴') || description.includes('风暴') || description.includes('飑线');
    });
    
    if (warningWeather.length > 0) {
      const warningDescriptions = warningWeather.map(code => {
        return config.weatherMap.find(item => item.code === code)?.description || code;
      });
      return `有天气警告: ${warningDescriptions.join(', ')}`;
    }
    return '无警告';
  }

  // 辅助函数
  function calculateHumidity(temp: number, dewpoint: number): string {
    if (isNaN(temp) || isNaN(dewpoint)) return 'N/A';
    const rh = 100 * (Math.exp((17.625 * dewpoint) / (243.04 + dewpoint)) / 
                      Math.exp((17.625 * temp) / (243.04 + temp)));
    return Math.round(rh).toString();
  }

  function getFIRRegion(icao: string): string {
    if (icao.startsWith('ZL')) return '兰州情报区';
    if (icao.startsWith('ZG')) return '广州情报区';
    if (icao.startsWith('ZS')) return '上海情报区';
    return 'Unknown';
  }
  

  function getTimeAgo(observationTime: string): string {
    if (!observationTime) return '未知';
    return '刚刚';
  }

  function getCeiling(clouds: any[]): string {
    const ceilingCloud = clouds.find(c => c.type === 'BKN' || c.type === 'OVC');
    return ceilingCloud ? ceilingCloud.height : 'None';
  }
}