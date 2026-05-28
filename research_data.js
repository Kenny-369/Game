// 1. 研發階段隨機事件庫 (可在此處無限擴充客製化事件與長篇文本描述)
const RD_EVENTS_DATA = [
    { id: 'tech_bottleneck', name: '遭遇底層技術瓶頸', desc: '目前的架構無法支撐預期的性能，工程師陷入膠著。' },
    { id: 'market_shift', name: '市場偏好突發偏移', desc: '競爭對手剛發布了相似概念產品，目前的方案顯得過時。' },
    { id: 'logic_error', name: '核心邏輯設計缺陷', desc: '在壓力測試中發現重大邏輯錯誤，繼續開發可能導致系統不穩。' }
];

// 2. 研發專案類型與基礎平衡設定 (維持您原本的開發天數、成功率與營收倍數)
const PROJECT_TYPES_DATA = {
    'paper': { name: '概念雛形/MVP (Paper)', durationDays: 14, successRate: 0.85, baseCost: 500000, revenueMult: 1.05 },
    'prototype': { name: '初期原型產品 (Prototype)', durationDays: 21, successRate: 0.80, baseCost: 2000000, revenueMult: 1.08 },
    'minor': { name: '產品小改款 (Minor Update)', durationDays: 30, successRate: 0.95, baseCost: 5000000, revenueMult: 1.1 },
    'major': { name: '主打旗艦產品 (Major Release)', durationDays: 90, successRate: 0.70, baseCost: 30000000, revenueMult: 2.5 },
    'revolutionary': { name: '革命性新技術 (Revolutionary)', durationDays: 210, successRate: 0.35, baseCost: 150000000, revenueMult: 8.0 },
    'moonshot': { name: '登月計畫/壟斷專利 (Moonshot)', durationDays: 450, successRate: 0.15, baseCost: 500000000, revenueMult: 25.0, risk: '極高' }
};

// 3. 13 個產業專屬客製化專案名稱 (對應 Paper ~ Moonshot 六大層級)
// 作為全域常數保留，供 ceo.js 各模組直接讀取渲染
const SECTOR_PROJECT_NAMES = {
    'semi': ['晶片架構設計圖', 'FPGA 原型驗證', '晶片小幅電路優化', '次世代先進製程微縮', '3D 矽光子/CoWoS 先進封裝', '室溫超導量子運算處理器'],
    'electronics': ['工業設計圖', '工程打樣機', '產品小改款', '旗艦級消費電子', '全息投影智能裝置', '無限能源驅動設備'],
    'software_ai': ['演算法模型架構', 'Beta 測試版', '大型版本更新', '商用殺手級應用', '通用人工智慧 (AGI)', '數位神經網路上傳'],
    'game': ['遊戲企劃案', '核心玩法 Demo', 'DLC 擴充內容', 'AAA 級旗艦大作', '沉浸式腦機介面', '完全潛行虛擬實境'],
    'telecom': ['通訊協定草案', '實驗室頻段測試', '基地台優化升級', '次世代通訊規格', '低軌衛星全球聯網', '星際量子通訊網路'],
    'auto': ['概念車草圖', '油土模型與風洞測試', '車型小改款', '次世代旗艦車款', 'L5 完全自動駕駛系統', '反重力磁浮飛行車'],
    'finance': ['金融商品量化模型', '內部回測系統', '高頻交易演算法更新', '跨國結算生態系', '去中心化全球貨幣', '完全預測市場神經網'],
    'realestate': ['土地開發評估', '建築模型與建照', '建案公設與綠能優化', '大型造鎮計畫', '零碳排垂直森林城市', '近地軌道太空站殖民地'],
    'retail': ['市場展店評估', '快閃概念店', '供應鏈物流優化', '無人化智慧連鎖店', '全球同城一小時達', '大腦潛意識精準推銷'],
    'food': ['新口味配方', '實驗室試吃品', '熱銷產品線擴充', '跨國爆款食品', '完美的非動物合成肉', '食用級全效基因改造素'],
    'pharma': ['分子結構篩選', '動物活體實驗', '臨床一/二期試驗', '重磅廣效型專利藥物', '針對性 mRNA 基因療法', '泛用型抗癌奈米機器人'],
    'transport': ['航線優化與吃水模擬', '貨櫃裝載與改裝測試', '機隊/車隊汰換與節能升級', '跨國洲際物流樞紐建置', '次世代超大型綠能貨櫃輪', '全球無人化智慧運輸聯網'],
    'energy': ['新能源場址評估', '實驗性微電網', '儲能設備轉換率優化', '大型商用離岸電廠', '商用核聚變 (核融合)', '戴森球能量收集技術']
};