import { APISource } from './types';

export const API_SOURCES: { [key: string]: APISource } = {
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