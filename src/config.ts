import { Schema } from 'koishi';
import { Config } from './types';

export const ConfigSchema = Schema.intersect([
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

export { Config };
