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
  primarySource: 'xflysim' | 'etops' | 'xbzglw';
}

// API源配置接口
export interface APISource {
  name: string;
  metarUrl: (icao: string) => string;
  parseMetar: (data: any) => { metar: string; taf: string };
  tafUrl?: (icao: string) => string;
  parseTaf?: (data: any) => string;
}

// 风分量计算结果
export interface WindComponents {
  headwind: number;
  crosswind: number;
}