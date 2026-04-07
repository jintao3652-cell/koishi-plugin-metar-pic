import { 
  ParsedMETAR, 
  AirportInfo, 
  RunwayInfo, 
  SunTimes, 
  Config,
  WindComponents 
} from './types';

// 辅助函数
export function calculateHumidity(temp: number, dewpoint: number): string {
  if (isNaN(temp) || isNaN(dewpoint)) return 'N/A';
  const rh = 100 * (Math.exp((17.625 * dewpoint) / (243.04 + dewpoint)) / 
                    Math.exp((17.625 * temp) / (243.04 + temp)));
  return Math.round(rh).toString();
}

export function getFIRRegion(icao: string): string {
  if (icao.startsWith('ZL')) return '兰州情报区';
  if (icao.startsWith('ZG')) return '广州情报区';
  if (icao.startsWith('ZS')) return '上海情报区';
  return 'Unknown';
}

export function getTimeAgo(observationTime: string): string {
  if (!observationTime) return '未知';
  return '刚刚';
}

export function getCeiling(clouds: any[]): string {
  const ceilingCloud = clouds.find(c => c.type === 'BKN' || c.type === 'OVC');
  return ceilingCloud ? ceilingCloud.height : 'None';
}

// 获取天气描述
export function getWeatherDescription(weather: string[], config: Config): string {
  if (weather.length === 0) return '晴朗';
  const descriptions = weather.map(code => {
    const found = config.weatherMap.find(item => item.code === code);
    return found ? found.description : code;
  });
  return descriptions.join('，') || '天气良好';
}

// 获取警告信息
export function getWarnings(parsedMETAR: ParsedMETAR, config: Config): string {
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

// 获取云层状态描述
export function getCloudCondition(clouds: any[], config: Config): string {
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

// 获取天气图标
export function getModernWeatherIcon(weather: string[], clouds: any[], config: Config): string {
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

// 生成HTML模板数据
export interface TemplateData {
  icao: string;
  airportName: string;
  windDirection: number;
  windSpeed: number;
  temperature: string;
  dewpoint: string;
  pressure: string;
  visibility: string;
  humidity: string;
  localTime: string;
  localDate: string;
  runwaySelector: string;
  cloudInfo: string;
  runwayTable: string;
  modernCompass: string;
  weatherIcon: string;
  modernMetricCards: string;
  modernObservationText: string;
  modernCloudProfile: string;
  metar: string;
  taf: string;
  flightRules: string;
  parsedMETAR: ParsedMETAR;
  config: Config;
  sunTimes: SunTimes;
}

// 创建HTML内容的函数
export function createModernWeatherHTML(templateData: TemplateData): string {
  // 这里使用从文件读取的HTML模板
  const fs = require('fs');
  const path = require('path');
  
  try {
    // 读取HTML模板文件
    const templatePath = path.join(__dirname, 'weather-template.html');
    let template = fs.readFileSync(templatePath, 'utf-8');
    
    // 替换模板中的变量
    template = template.replace(/{{ICAO}}/g, templateData.icao);
    template = template.replace(/{{AIRPORT_NAME}}/g, templateData.airportName);
    template = template.replace(/{{WIND_DIRECTION}}/g, templateData.windDirection.toString());
    template = template.replace(/{{WIND_SPEED}}/g, templateData.windSpeed.toString());
    template = template.replace(/{{TEMPERATURE}}/g, templateData.temperature);
    template = template.replace(/{{DEWPOINT}}/g, templateData.dewpoint);
    template = template.replace(/{{PRESSURE}}/g, templateData.pressure);
    template = template.replace(/{{VISIBILITY}}/g, templateData.visibility);
    template = template.replace(/{{HUMIDITY}}/g, templateData.humidity);
    template = template.replace(/{{LOCAL_TIME}}/g, templateData.localTime);
    template = template.replace(/{{LOCAL_DATE}}/g, templateData.localDate);
    template = template.replace(/{{RUNWAY_SELECTOR}}/g, templateData.runwaySelector);
    template = template.replace(/{{CLOUD_INFO}}/g, templateData.cloudInfo);
    template = template.replace(/{{RUNWAY_TABLE}}/g, templateData.runwayTable);
    template = template.replace(/{{MODERN_COMPASS}}/g, templateData.modernCompass);
    template = template.replace(/{{WEATHER_ICON}}/g, templateData.weatherIcon);
    template = template.replace(/{{MODERN_METRIC_CARDS}}/g, templateData.modernMetricCards);
    template = template.replace(/{{MODERN_OBSERVATION_TEXT}}/g, templateData.modernObservationText);
    template = template.replace(/{{MODERN_CLOUD_PROFILE}}/g, templateData.modernCloudProfile);
    template = template.replace(/{{METAR}}/g, templateData.metar);
    template = template.replace(/{{TAF}}/g, templateData.taf || '');
    template = template.replace(/{{FLIGHT_RULES}}/g, templateData.flightRules);
    
    // 替换FIR区域
    template = template.replace(/{{FIR_REGION}}/g, getFIRRegion(templateData.icao));
    
    return template;
  } catch (error) {
    console.error('读取HTML模板失败:', error);
    // 返回一个简单的错误页面
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>气象信息</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
      </style>
    </head>
    <body>
      <h1>气象信息加载失败</h1>
      <p>无法加载HTML模板</p>
    </body>
    </html>`;
  }
}

// 生成跑道选择器
export function generateModernRunwaySelector(
  runways: RunwayInfo[], 
  runwayWindComponents: Array<{runway: RunwayInfo, components: WindComponents}>
): string {
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
  const runwayLength = 480;
  const runwayWidth = 65;
  const centerLineWidth = 4;
  const centerLineLength = 10;
  const centerLineGap = 8;
  const thresholdLineWidth = 6;
  const thresholdLineLength = 20;
  const thresholdLineSpacing = 8;
  const fontSize = 16;
  
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