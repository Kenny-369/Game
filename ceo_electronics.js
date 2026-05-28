// ceo_electronics.js - 電腦與週邊產業（四大商業模型）核心模擬子系統
const CEO_ELECTRONICS = {

    // ==========================================
    // 1. 初始化資產 (Init Assets)
    // ==========================================
    initAssets(corp) {
        if (!corp.electronicsState) {
            corp.electronicsState = {
                // 通用電子業週期指數（由 engine.js 每日更新）
                lastEci: 100,

                // ── EMS 電子製造服務 ──
                productionLines: 1,        // 生產線數量
                automationLevel: 1,        // 自動化等級 (1~5)
                backlog: [],               // 待交代工訂單佇列

                // ── 品牌廠 (Brand) ──
                productPortfolio: [],      // 已商用產品清單
                activeRnd: [],             // 研發中的新品
                brandPower: 50,            // 品牌力 0~200
                productCategory: 'generic',// 主力銷售品類

                // ── 伺服器/工控 (Server & IPC) ──
                serverRackCapacity: 0,     // 機架產能 (台/月)
                certLevel: 1,              // 認證等級 (1=基礎, 2=NEBS, 3=MIL-SPEC)
                cloudContracts: [],        // 雲端大廠框架合約

                // ── 零組件廠 (Components) ──
                componentCategory: 'generic', // 零組件子分類
                dailyUnitOutput: 0,        // 日產量（片/顆/組）
                unitPrice: 0,              // 元件單價
                qualityRating: 1.0,        // 品質認證因子
                customerTier: [],          // 大客戶綁定清單

                // ── 玩家創辦公司：產品主類選擇旗標 ──
                subModelChosen: false      // 是否已完成二次細分選擇
            };
        }

        const state = corp.electronicsState;
        const p = corp.price || corp.basePrice || 100;
        const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;

        // 玩家創立之公司為空殼，不給予初始資源（等待二次細分選擇）
        if (corp.isPlayerFounded) {
            state.subModelChosen = false;
            return;
        }

        // ==========================================
        // 非玩家（上市公司）依據 bizModel 給予初始資源
        // ==========================================

        if (corp.bizModel === 'ems') {
            state.productionLines = scale >= 5 ? 6 : (scale >= 2 ? 3 : 1);
            state.automationLevel = scale >= 5 ? 4 : (scale >= 2 ? 3 : 2);
            // 依 productType 初始化訂單
            const pt = corp.productType || 'pc_ems';
            const orderNames = {
                consumer_ems: ['蘋果 iPhone 旗艦代工年度框架合約', '任天堂 Switch 次世代遊戲主機代工'],
                pc_ems: ['AI 伺服器機架大量組裝合約', '高端商務筆電組裝訂單'],
                automotive_ems: ['車載中控面板顯示器大單', '醫療高規顯示器代工合約']
            };
            const names = orderNames[pt] || orderNames['pc_ems'];
            names.forEach((n, i) => {
                state.backlog.push({ id: `B-${Date.now()}-${i}`, clientName: i === 0 ? '品牌旗艦大廠' : '次級品牌商', productName: n, daysLeft: 8 + i * 5, revenue: (scale * 8000000 + 5000000) });
            });

        } else if (corp.bizModel === 'brand') {
            state.brandPower = scale >= 5 ? 150 : (scale >= 2 ? 100 : 60);
            const pt = corp.productType || 'pc_laptop';
            const productNames = {
                handheld: '旗艦智慧手機 (S 系列)',
                pc_laptop: '高效能商務筆電 (UltraBook Pro)',
                console: '次世代家用遊戲主機 (NX Pro)',
            };
            const pName = productNames[pt] || '主力品牌終端產品';
            state.productPortfolio.push({
                id: `P-${Date.now()}`,
                name: corp.customProduct || pName,
                type: pt,
                marketShare: scale >= 5 ? 0.35 : 0.15,
                dailyRevBase: scale * 600000 + 300000,
                age: 0,
                generation: 1
            });

        } else if (corp.bizModel === 'server_ipc') {
            const pt = corp.productType || 'industrial_pc';
            state.certLevel = pt === 'ai_server' ? 3 : 2;
            state.serverRackCapacity = scale * 80 + 50;
            const contractNames = {
                ai_server: ['超大型雲端 HGX H100 AI 運算叢集年度供應合約', 'CSP 定製液冷散熱 AI 伺服器框架合約'],
                industrial_pc: ['工廠 MES 邊緣運算控制器供應合約', '物聯網 IoT 閘道器大廠合作合約']
            };
            const cnames = contractNames[pt] || contractNames['industrial_pc'];
            cnames.forEach((n, i) => {
                state.cloudContracts.push({ id: `C-${Date.now()}-${i}`, clientName: i === 0 ? '雲端巨頭 (CSP)' : '製造業龍頭', contractName: n, dailyRev: scale * 200000 + 50000 * (i + 1), daysRemaining: 90 });
            });

        } else if (corp.bizModel === 'components') {
            const pt = corp.productType || 'passives';
            state.componentCategory = pt;
            const categoryDefaults = {
                power_unit:  { dailyUnitOutput: scale * 800 + 500,  unitPrice: 1800,  qualityRating: 1.2 },
                optics:      { dailyUnitOutput: scale * 200 + 100,  unitPrice: 8500,  qualityRating: 1.5 },
                passives:    { dailyUnitOutput: scale * 5000 + 2000, unitPrice: 45,    qualityRating: 1.0 }
            };
            const def = categoryDefaults[pt] || categoryDefaults['passives'];
            state.dailyUnitOutput = def.dailyUnitOutput;
            state.unitPrice = def.unitPrice;
            state.qualityRating = def.qualityRating;
            // 綁定大客戶
            state.customerTier.push({ name: '全球 AI 伺服器大廠', pullRatio: 0.4 });
            state.customerTier.push({ name: '全球智慧手機品牌廠', pullRatio: 0.3 });
        }
    },

    // ==========================================
    // 2. UI 渲染派發 (Render)
    // ==========================================
    renderElectronicsTab(corp, contentArea, isReadOnly) {
        if (!corp.electronicsState) this.initAssets(corp);
        let html = `<div class="p-4 bg-black border border-gray-800 rounded crt">`;

        let eci = app.state.ECI || 100;
        let eciColor = eci >= 100 ? 'text-green-400 font-bold' : 'text-red-400 font-bold';
        html += `<div class="mb-4 text-xs text-gray-300 bg-gray-900 bg-opacity-80 p-3 rounded border border-gray-800 flex justify-between items-center shadow-[inset_0_0_10px_rgba(0,255,0,0.05)]">
            <div>💻 全球電子消費景氣指數 (ECI): <span class="${eciColor}">${eci.toFixed(1)}%</span></div>
            <div class="text-xs text-gray-400">※ 影響 EMS 代工填單率、品牌產品需求、伺服器採購熱度與元件拉貨強度</div>
        </div>`;

        // 第一年護航補貼橫幅
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        if (isSubsidized) {
            html += `<div class="mb-4 text-xs bg-blue-950 bg-opacity-30 p-3 rounded border border-blue-700 text-blue-300 flex flex-col gap-1 shadow-[0_0_15px_rgba(0,100,255,0.1)] animate-pulse">
                <div class="font-bold flex items-center gap-1.5">🔵 國家智慧製造產業扶植法案生效中 (上市/創立前三個月特別護航)</div>
                <div class="text-xs text-gray-300">※ 享有：日常人事與廠務折舊成本減免 50% 補貼。</div>
            </div>`;
        }

        // 玩家創立且尚未選擇二次細分，顯示選擇面板
        if (corp.isPlayerFounded && !corp.electronicsState.subModelChosen) {
            html += this.renderSubModelSelectionUI(corp);
            html += `</div>`;
            contentArea.innerHTML = html;
            return;
        }

        // 依 bizModel 分流渲染
        if (corp.bizModel === 'ems') {
            html += this.renderEmsUI(corp, isReadOnly);
        } else if (corp.bizModel === 'brand') {
            html += this.renderBrandUI(corp, isReadOnly);
        } else if (corp.bizModel === 'server_ipc') {
            html += this.renderServerIpcUI(corp, isReadOnly);
        } else if (corp.bizModel === 'components') {
            html += this.renderComponentsUI(corp, isReadOnly);
        } else {
            html += `<div class="text-gray-400 text-center py-8">此公司的商業模式 [${corp.bizModel}] 暫無對應的核心經營面板。</div>`;
        }

        html += `</div>`;
        contentArea.innerHTML = html;
    },

    // ==========================================
    // 2-選擇. 玩家創辦公司「主力銷售產品」二次細分選擇
    // ==========================================
    renderSubModelSelectionUI(corp) {
        const biz = corp.bizModel;
        let html = `<div class="p-2">
            <h3 class="text-blue-400 font-bold text-md mb-1 flex items-center gap-1.5">⚡ 電腦與週邊核心事業方向選擇</h3>
            <p class="text-xs text-gray-300 mb-4">請選擇您公司的主力產品類型，選擇後將解鎖對應的核心經營面板與起跑線資源配發。</p>
            <div class="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">`;

        if (biz === 'ems') {
            html += this._selectionCard('consumer_ems', '📱 消費性電子代工 (EMS - 手機/遊戲機)', '鴻海、和碩型。承接 Apple、Sony 等品牌旗艦手機、遊戲主機精密組裝。高量能低毛利但訂單穩定。', `CEO_ELECTRONICS.selectSubModel('${corp.id}', 'consumer_ems')`, 'border-cyan-900 text-cyan');
            html += this._selectionCard('pc_ems', '💻 電腦伺服器代工 (EMS - PC/Server)', '廣達、仁寶型。承接品牌筆電、AI 伺服器機架組裝。毛利稍高但需高自動化設備投資。', `CEO_ELECTRONICS.selectSubModel('${corp.id}', 'pc_ems')`, 'border-blue-900 text-blue-400');
            html += this._selectionCard('automotive_ems', '🚗 車載/醫療電子代工 (EMS - Auto/Medical)', '佳世達型。承接車載中控、醫療顯示器組裝。毛利最高但客戶認證門檻極嚴。', `CEO_ELECTRONICS.selectSubModel('${corp.id}', 'automotive_ems')`, 'border-green-900 text-green-400');

        } else if (biz === 'brand') {
            html += this._selectionCard('handheld', '📱 智慧手機與穿戴裝置品牌 (Handheld)', '蘋果、三星型。主攻消費者智慧終端市場。品牌力是護城河，但每代換機週期的研發賭注極大。', `CEO_ELECTRONICS.selectSubModel('${corp.id}', 'handheld')`, 'border-cyan-900 text-cyan');
            html += this._selectionCard('pc_laptop', '💻 個人電腦與筆電品牌 (PC/Laptop)', '華碩、宏碁型。主打商務與電競筆電市場。毛利率穩定，透過規格升級與品牌推廣建立溢價。', `CEO_ELECTRONICS.selectSubModel('${corp.id}', 'pc_laptop')`, 'border-blue-900 text-blue-400');
            html += this._selectionCard('console', '🎮 遊戲主機與 XR 裝置品牌 (Console/VR)', 'Sony、宏達電型。遊戲機生態系形成護城河，但需同步投資第一方軟體內容。', `CEO_ELECTRONICS.selectSubModel('${corp.id}', 'console')`, 'border-purple-900 text-purple-400');

        } else if (biz === 'server_ipc') {
            html += this._selectionCard('ai_server', '🖥️ 高效能 AI 伺服器製造 (AI Server)', '緯穎、Super Micro 型。主攻雲端 CSP 大廠 NVIDIA HGX 叢集採購。訂單金額巨大但認證嚴格。', `CEO_ELECTRONICS.selectSubModel('${corp.id}', 'ai_server')`, 'border-yellow-800 text-yellow-400');
            html += this._selectionCard('industrial_pc', '🏭 工控電腦與物聯網系統 (IPC/IoT)', '研華、Cisco 型。主攻智慧製造、物聯網邊緣運算市場。高可靠性認證與長訂單生命週期是護城河。', `CEO_ELECTRONICS.selectSubModel('${corp.id}', 'industrial_pc')`, 'border-green-900 text-green-400');

        } else if (biz === 'components') {
            html += this._selectionCard('power_unit', '⚡ 電源供應器與散熱模組 (Power & Thermal)', '台達電型。AI 伺服器高功率 PSU 需求爆發，是 AI 基礎建設的水電廠。', `CEO_ELECTRONICS.selectSubModel('${corp.id}', 'power_unit')`, 'border-orange-900 text-orange-400');
            html += this._selectionCard('optics', '🔭 精密光學鏡頭組 (Optical Lens)', '大立光型。技術壁壘極高的光學鏡頭精密研磨。一旦技術突破可享有極高的定價壟斷權。', `CEO_ELECTRONICS.selectSubModel('${corp.id}', 'optics')`, 'border-cyan-900 text-cyan');
            html += this._selectionCard('passives', '🎴 被動元件與電路板 (Passives & PCB)', '國巨、華通型。MLCC 電容、電路板是萬用型被動元件，產能利用率與景氣週期高度掛鉤。', `CEO_ELECTRONICS.selectSubModel('${corp.id}', 'passives')`, 'border-green-900 text-green-400');
        } else {
            html += `<div class="text-gray-500 text-center py-6">此商業模式 [${biz}] 暫無可用的子模型選項。</div>`;
        }

        html += `</div></div>`;
        return html;
    },

    _selectionCard(key, title, desc, onclickFn, colorClass) {
        return `<div class="bg-gray-950 p-2.5 rounded border ${colorClass.replace('text-', 'border-').replace('-400', '-700').replace('-900', '-700')} border-opacity-50 hover:bg-gray-900 transition flex justify-between items-center">
            <div class="w-3/4">
                <span class="${colorClass} font-bold text-xs">${title}</span>
                <div class="text-xs text-gray-400 mt-1">${desc}</div>
            </div>
            <button onclick="${onclickFn}" class="btn-retro text-xs py-1 ${colorClass.includes('cyan') ? 'border-cyan text-cyan' : colorClass.includes('blue') ? 'border-blue-400 text-blue-400' : colorClass.includes('purple') ? 'border-purple-400 text-purple-400' : colorClass.includes('yellow') ? 'border-yellow-400 text-yellow-400' : colorClass.includes('orange') ? 'border-orange-400 text-orange-400' : 'border-green-400 text-green-400'} font-bold px-3 hover:bg-gray-800 transition">選擇此項</button>
        </div>`;
    },

    // ==========================================
    // 2-選擇-執行. 二次細分選擇核心邏輯
    // ==========================================
    selectSubModel(corpId, subType) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.electronicsState) return;

        const state = corp.electronicsState;
        state.subModelChosen = true;

        // 依選擇配發起跑線資源
        if (subType === 'consumer_ems' || subType === 'pc_ems' || subType === 'automotive_ems') {
            corp.productType = subType;
            state.productionLines = 1;
            state.automationLevel = 2;
            const orderPrices = { consumer_ems: 12000000, pc_ems: 8000000, automotive_ems: 15000000 };
            const orderNames = { consumer_ems: '國家智慧終端採購委託案', pc_ems: '政府公務 PC 採購代工案', automotive_ems: '國防車載電子組裝試產案' };
            state.backlog = [{ id: 'B-startup', clientName: '政府採購委員會', productName: orderNames[subType], daysLeft: 20, revenue: orderPrices[subType] }];

        } else if (subType === 'handheld' || subType === 'pc_laptop' || subType === 'console') {
            corp.productType = subType;
            state.brandPower = 20;
            state.productPortfolio = [];
            state.activeRnd = [];

        } else if (subType === 'ai_server' || subType === 'industrial_pc') {
            corp.productType = subType;
            state.serverRackCapacity = 10;
            state.certLevel = 1;
            state.cloudContracts = [{ id: 'C-startup', clientName: '國家 AI 基礎建設局', contractName: '國家 AI 算力基礎設施建置合約', dailyRev: 200000, daysRemaining: 60 }];

        } else if (subType === 'power_unit') {
            corp.productType = subType;
            state.componentCategory = 'power_unit';
            state.dailyUnitOutput = 200;
            state.unitPrice = 1500;
            state.qualityRating = 1.0;
            state.customerTier = [{ name: '國家電力研究院', pullRatio: 0.3 }];

        } else if (subType === 'optics') {
            corp.productType = subType;
            state.componentCategory = 'optics';
            state.dailyUnitOutput = 50;
            state.unitPrice = 3000;
            state.qualityRating = 1.0;
            state.customerTier = [{ name: '手機品牌廠研發採購部', pullRatio: 0.4 }];

        } else if (subType === 'passives') {
            corp.productType = subType;
            state.componentCategory = 'passives';
            state.dailyUnitOutput = 2000;
            state.unitPrice = 30;
            state.qualityRating = 1.0;
            state.customerTier = [{ name: '電子零件通路商', pullRatio: 0.5 }];
        }

        const subNames = {
            consumer_ems: '消費性電子代工 (EMS)',
            pc_ems: '電腦伺服器代工 (EMS)',
            automotive_ems: '車載/醫療電子代工 (EMS)',
            handheld: '智慧手機品牌 (Brand)',
            pc_laptop: '個人電腦品牌 (Brand)',
            console: '遊戲主機品牌 (Brand)',
            ai_server: 'AI 高效能伺服器 (Server)',
            industrial_pc: '工控電腦 (IPC)',
            power_unit: '電源供應與散熱元件 (Components)',
            optics: '精密光學鏡頭 (Components)',
            passives: '被動元件與電路板 (Components)'
        };
        app.log(`【產品定向完成】🎉 恭喜！${corp.name} 順利定調核心事業為 [${subNames[subType] || subType}]！專屬核心經營面板已解鎖！`, 'text-blue-300 font-bold animate-pulse');
        this.refreshElectronicsTabUI(corp);
    },

    // ==========================================
    // 2-A. EMS 電子製造服務 面板
    // ==========================================
    renderEmsUI(corp, isReadOnly) {
        const state = corp.electronicsState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        const eci = app.state.ECI || 100;
        const fillRate = Math.min(100, Math.max(20, Math.floor(eci * 0.85)));
        const fillColor = fillRate < 50 ? 'text-red-500 font-bold' : (fillRate > 80 ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold');
        const ptLabels = { consumer_ems: '📱 消費性電子代工', pc_ems: '💻 電腦伺服器代工', automotive_ems: '🚗 車載/醫療代工' };
        const ptLabel = ptLabels[corp.productType] || 'EMS 代工';

        let html = `<h3 class="text-blue-400 font-bold mb-2 text-md flex items-center gap-1">🏭 ${ptLabel} (EMS) 決策面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">代工廠的核心命題是「效率」與「產能」。透過提升自動化等級壓縮人工成本，並確保足夠的生產線承接品牌旗艦大廠訂單。代工業毛利薄，但穩定龐大的訂單量才是你生存的命脈。</p>`;

        html += `<div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">生產線數量</div>
                <div class="text-blue-400 font-mono font-bold text-lg mt-0.5">${state.productionLines} 條</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">自動化等級</div>
                <div class="text-cyan font-mono font-bold text-lg mt-0.5">Lv.${state.automationLevel}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">當前訂單填單率</div>
                <div class="${fillColor} font-mono text-lg mt-0.5">${fillRate}%</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-blue-500 pl-1.5">🏗️ 產能投資 (CapEx)</h4>`;
            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-blue-400 text-xs">【新增生產線】</div>
                        <p class="text-xs text-gray-400 mt-1">擴充廠房生產線，每增加一條線，日代工產能與 Backlog 消化速度顯著提升。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_ELECTRONICS.addProductionLine('${corp.id}')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-blue-400 text-blue-400 hover:bg-blue-950 font-bold transition">
                        擴建生產線 (-$25M)
                    </button>
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-cyan text-xs">【提升自動化等級】</div>
                        <p class="text-xs text-gray-400 mt-1">導入機械手臂與 AI 品管系統，永久降低人工成本佔比並提升生產良率。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_ELECTRONICS.upgradeAutomation('${corp.id}')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-cyan text-cyan hover:bg-cyan-950 font-bold transition">
                        升級自動化 (-$40M) ${state.automationLevel >= 5 ? '(已達最高級)' : ''}
                    </button>
                </div>
            </div>`;
        }

        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-blue-500 pl-1.5">📦 Backlog 訂單佇列</h4>`;
        html += this.renderBacklogSection(state.backlog, corp.id, 'ems');
        return html;
    },

    // ==========================================
    // 2-B. 品牌廠 (Brand) 面板
    // ==========================================
    renderBrandUI(corp, isReadOnly) {
        const state = corp.electronicsState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        const ptLabels = { handheld: '📱 智慧手機品牌', pc_laptop: '💻 個人電腦品牌', console: '🎮 遊戲主機品牌' };
        const ptLabel = ptLabels[corp.productType] || '消費電子品牌';

        let html = `<h3 class="text-cyan font-bold mb-2 text-md flex items-center gap-1">✨ ${ptLabel} 決策面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">品牌力是您最重要的資產。透過研發下一代旗艦產品建立換機週期，並持續投入行銷活動強化品牌溢價。每款新品都是一場高風險的市場賭注！</p>`;

        html += `<div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">品牌力指數</div>
                <div class="text-cyan font-mono font-bold text-lg mt-0.5">${state.brandPower}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">在售主力產品數</div>
                <div class="text-white font-mono font-bold text-lg mt-0.5">${state.productPortfolio.length} 款</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">研發中新品</div>
                <div class="text-yellow-400 font-mono font-bold text-lg mt-0.5">${state.activeRnd.length} 項</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">🧪 發動新世代產品研發</h4>`;
            const rdCost = { handheld: { cost: 80000000, days: 60, risk: '85%', label: '旗艦智慧手機 (New Gen)', rev: 1200000 }, pc_laptop: { cost: 50000000, days: 45, risk: '90%', label: '高效商務筆電 (New Pro)', rev: 700000 }, console: { cost: 120000000, days: 90, risk: '75%', label: '次世代遊戲主機 (Successor)', rev: 1800000 } };
            const rdInfo = rdCost[corp.productType] || rdCost['pc_laptop'];
            html += `<div class="bg-gray-950 p-3 rounded border border-cyan border-opacity-30 mb-5 flex justify-between items-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div>
                    <div class="text-cyan font-bold text-xs">🚀 ${rdInfo.label}</div>
                    <div class="text-xs text-gray-400 mt-0.5">研發成本: -$${Math.floor(rdInfo.cost/1000000)}M | 耗時: ${rdInfo.days}天 | 上市成功率: ${rdInfo.risk}</div>
                    <div class="text-xs text-green-400 mt-0.5">上市後估計日收入基礎值: +$${app.formatMoney(rdInfo.rev)}/日</div>
                </div>
                <button ${disabledAttr} onclick="CEO_ELECTRONICS.startBrandRnd('${corp.id}')" class="${disabledClass} btn-retro text-xs py-1.5 px-3 border-cyan text-cyan font-bold hover:bg-cyan-950 transition">
                    發動研發
                </button>
            </div>`;

            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">📣 行銷與品牌力強化</h4>`;
            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <button ${disabledAttr} onclick="CEO_ELECTRONICS.doBrandMarketing('${corp.id}', 'regional')" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-cyan border-opacity-30 text-left transition hover:border-cyan">
                    <div class="text-cyan text-xs font-bold">📡 區域整合行銷活動</div>
                    <div class="text-xs text-gray-400 mt-1">成本: -$15M | 品牌力: +10</div>
                </button>
                <button ${disabledAttr} onclick="CEO_ELECTRONICS.doBrandMarketing('${corp.id}', 'global')" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-yellow-700 border-opacity-30 text-left transition hover:border-yellow-400">
                    <div class="text-yellow-400 text-xs font-bold">🌏 全球旗艦發表會</div>
                    <div class="text-xs text-gray-400 mt-1">成本: -$50M | 品牌力: +40</div>
                </button>
            </div>`;
        }

        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">🔬 研發中的新品計畫</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs mb-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.activeRnd.length > 0) {
            state.activeRnd.forEach(r => {
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-1.5 last:border-0">
                    <div class="text-cyan font-bold">${r.name}</div>
                    <div class="text-yellow-400 animate-pulse font-mono">研發中... 剩餘 ${r.daysLeft} 天</div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前沒有進行中的研發計畫。</div>`;
        }
        html += `</div>`;

        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">📦 在售主力產品線</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.productPortfolio.length > 0) {
            state.productPortfolio.forEach(p => {
                let decay = Math.max(0.1, 1 - (p.age / 730)); // 2年生命週期
                let eci = app.state.ECI || 100;
                let brandMult = Math.max(0.5, (state.brandPower / 100));
                let currentDaily = p.dailyRevBase * decay * (eci / 100) * brandMult;
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2 last:border-0">
                    <div>
                        <div class="text-cyan font-bold">${p.name}</div>
                        <div class="text-xs text-gray-400 mt-0.5">上市 ${p.age} 天 | 生命週期: ${(decay*100).toFixed(0)}% | 品牌力加乘: x${brandMult.toFixed(2)}</div>
                    </div>
                    <div class="text-green-400 font-mono text-right">
                        <div>日銷售營收: +$${app.formatMoney(currentDaily)}</div>
                        <div class="text-xs text-gray-400">代工與物料成本: -$${app.formatMoney(currentDaily * 0.55)}</div>
                    </div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前無在售產品，公司無持續性品牌收入來源。請發動研發！</div>`;
        }
        html += `</div>`;
        return html;
    },

    // ==========================================
    // 2-C. 伺服器與工控電腦 (Server & IPC) 面板
    // ==========================================
    renderServerIpcUI(corp, isReadOnly) {
        const state = corp.electronicsState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        const ptLabel = corp.productType === 'ai_server' ? '🖥️ AI 高效能伺服器' : '🏭 工控電腦與物聯網系統';
        const certLabels = ['', '基礎品質認證', 'NEBS Level 3 電信級認證', 'MIL-SPEC 軍規認證'];

        let html = `<h3 class="text-yellow-400 font-bold mb-2 text-md flex items-center gap-1">${ptLabel} 決策面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">B2B 精品製造，客戶是雲端巨頭或製造業龍頭。一旦拿到框架採購合約，就是長期穩定的被動收入引擎。但進入壁壘極高——需要取得嚴苛的技術認證，以及對高功率散熱與系統穩定性的深度工程投入。</p>`;

        html += `<div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">月產能</div>
                <div class="text-yellow-400 font-mono font-bold text-lg mt-0.5">${state.serverRackCapacity} 台/月</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">品質認證等級</div>
                <div class="text-white font-bold text-xs mt-0.5">Lv.${state.certLevel} ${certLabels[state.certLevel] || ''}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">有效框架合約數</div>
                <div class="text-green-400 font-mono font-bold text-lg mt-0.5">${state.cloudContracts.length} 件</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-500 pl-1.5">⚙️ 產能投資與認證升級</h4>`;
            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-yellow-400 text-xs">【擴充月產能】</div>
                        <p class="text-xs text-gray-400 mt-1">投資組裝廠房，永久提升每月可出貨的機架/系統數量。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_ELECTRONICS.expandServerCapacity('${corp.id}')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-yellow-400 text-yellow-400 hover:bg-yellow-950 font-bold transition">
                        擴建產能 (-$30M, +30台/月)
                    </button>
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">【取得進階認證】</div>
                        <p class="text-xs text-gray-400 mt-1">通過 NEBS 或 MIL-SPEC 認證，解鎖頂級客戶的框架合約資格，每日收入顯著躍升。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_ELECTRONICS.upgradeServerCert('${corp.id}')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-green-400 text-green-400 hover:bg-green-950 font-bold transition">
                        申請認證升級 (-$60M) ${state.certLevel >= 3 ? '(已達最高級)' : ''}
                    </button>
                </div>
            </div>`;
        }

        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-500 pl-1.5">📋 雲端與工業框架合約</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.cloudContracts.length > 0) {
            state.cloudContracts.forEach(c => {
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2 last:border-0">
                    <div>
                        <div class="text-yellow-400 font-bold">${c.contractName} <span class="text-gray-400 text-xs ml-1">(${c.clientName})</span></div>
                        <div class="text-xs text-gray-400 mt-0.5">合約剩餘: ${c.daysRemaining} 天</div>
                    </div>
                    <div class="text-green-400 font-mono font-bold">+$${app.formatMoney(c.dailyRev)}/日</div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前沒有有效的框架合約。請投資認證升級以爭取頂級客戶。</div>`;
        }
        html += `</div>`;
        return html;
    },

    // ==========================================
    // 2-D. 零組件廠 (Components) 面板
    // ==========================================
    renderComponentsUI(corp, isReadOnly) {
        const state = corp.electronicsState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        const catLabels = { power_unit: '⚡ 電源供應與散熱元件', optics: '🔭 精密光學鏡頭', passives: '🎴 被動元件與電路板' };
        const catLabel = catLabels[state.componentCategory] || '零組件製造';
        const dailyRev = state.dailyUnitOutput * state.unitPrice * state.qualityRating;

        let html = `<h3 class="text-green-400 font-bold mb-2 text-md flex items-center gap-1">${catLabel} 決策面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">精密零組件製造的護城河是「技術」與「良率」。下游品牌廠與 EMS 代工廠每生產一台終端產品，必然要向您採購元件——只要你維持在業界最高的品質認證，就可以安穩躺收穩定的 B2B 材料採購費！</p>`;

        html += `<div class="grid grid-cols-4 gap-2 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">日產量</div>
                <div class="text-green-400 font-mono font-bold text-sm mt-0.5">${state.dailyUnitOutput.toLocaleString()} 件</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">元件單價</div>
                <div class="text-white font-mono font-bold text-sm mt-0.5">$${state.unitPrice.toLocaleString()}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">品質認證加乘</div>
                <div class="text-cyan font-mono font-bold text-sm mt-0.5">x${state.qualityRating.toFixed(2)}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">估算日材料收入</div>
                <div class="text-green-400 font-mono font-bold text-sm mt-0.5">+$${app.formatMoney(dailyRev)}</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">🏭 產能與品質升級</h4>`;
            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">【擴建製程產線】</div>
                        <p class="text-xs text-gray-400 mt-1">投資精密製程設備，永久提升日產量，攤薄單位固定成本。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_ELECTRONICS.expandComponentOutput('${corp.id}')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-green-400 text-green-400 hover:bg-green-950 font-bold transition">
                        擴建產線 (-$20M, 日產量 +500)
                    </button>
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-cyan text-xs">【通過國際品質認證】</div>
                        <p class="text-xs text-gray-400 mt-1">取得 AEC-Q 車規或 ISO 醫療認證，永久提升品質加乘因子，並解鎖更高利潤的大客戶。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_ELECTRONICS.upgradeComponentQuality('${corp.id}')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-cyan text-cyan hover:bg-cyan-950 font-bold transition">
                        申請認證升級 (-$35M, 品質 +0.15x)
                    </button>
                </div>
            </div>`;
        }

        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">🤝 大客戶綁定清單</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.customerTier.length > 0) {
            state.customerTier.forEach(c => {
                html += `<div class="flex justify-between border-b border-gray-900 py-1.5 text-gray-300 last:border-0">
                    <span class="text-green-400 font-bold">${c.name}</span>
                    <span class="text-cyan font-mono">採購佔比: ${(c.pullRatio * 100).toFixed(0)}% 產能</span>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">尚未綁定任何大客戶。請提升品質認證等級以吸引品牌廠採購。</div>`;
        }
        html += `</div>`;
        return html;
    },

    // ==========================================
    // 共用. Backlog 訂單渲染
    // ==========================================
    renderBacklogSection(backlog, corpId, type) {
        let html = `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (backlog && backlog.length > 0) {
            backlog.forEach(b => {
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2 last:border-0">
                    <div>
                        <div class="text-blue-400 font-bold">${b.productName || b.type || '代工訂單'} <span class="text-gray-400 text-xs ml-1">(${b.clientName})</span></div>
                        <div class="text-xs text-gray-400 mt-0.5">合約金額: $${app.formatMoney(b.revenue || b.price || 0)}</div>
                    </div>
                    <div class="text-yellow-400 animate-pulse font-mono">交期: ${b.daysLeft} 天</div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前沒有待交訂單。</div>`;
        }
        html += `</div>`;
        return html;
    },

    // ==========================================
    // 3. 玩家操作互動 (Actions)
    // ==========================================

    // A. EMS 新增生產線
    addProductionLine(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.electronicsState) return;
        const cost = 25000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost;
            corp.electronicsState.productionLines++;
            app.log(`【產能擴充】🏭 ${corp.name} 投資 $25M 新增一條 SMT 生產線，製造實力大幅提升！`, 'text-blue-400 font-bold');
            this.refreshElectronicsTabUI(corp);
        } else {
            app.log(`【資金不足】擴建生產線需要 $25,000,000 企業現金！`, 'text-red-500');
        }
    },

    // B. EMS 提升自動化等級
    upgradeAutomation(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.electronicsState) return;
        const state = corp.electronicsState;
        if (state.automationLevel >= 5) { app.log('自動化等級已達 Lv.5 最高級！', 'text-gray-400'); return; }
        const cost = 40000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost;
            state.automationLevel++;
            app.log(`【自動化升級】🤖 ${corp.name} 導入次世代機器人自動化系統，自動化等級提升至 Lv.${state.automationLevel}！人工成本佔比永久下降 10%！`, 'text-cyan font-bold');
            this.refreshElectronicsTabUI(corp);
        } else {
            app.log(`【資金不足】自動化升級需要 $40,000,000 企業現金！`, 'text-red-500');
        }
    },

    // C. 品牌廠發動新品研發
    startBrandRnd(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.electronicsState) return;
        const state = corp.electronicsState;
        const rdCost = { handheld: 80000000, pc_laptop: 50000000, console: 120000000 };
        const rdDays = { handheld: 60, pc_laptop: 45, console: 90 };
        const rdNames = { handheld: '次世代旗艦智慧手機 (New Gen)', pc_laptop: '全新輕薄高效商務筆電 (New Pro)', console: '次世代遊戲主機 (Successor)' };
        const pt = corp.productType || 'pc_laptop';
        const cost = rdCost[pt] || 50000000;
        if (state.activeRnd.length >= 2) { app.log('研發佇列已滿！最多同時進行 2 項新品研發計畫。', 'text-yellow-400'); return; }
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost;
            state.activeRnd.push({ id: `R-${Date.now()}`, name: rdNames[pt], daysLeft: rdDays[pt], type: pt, revBase: { handheld: 1200000, pc_laptop: 700000, console: 1800000 }[pt] || 700000 });
            app.log(`【研發啟動】🧪 ${corp.name} 正式啟動新一代 [${rdNames[pt]}] 研發計畫！研發週期 ${rdDays[pt]} 天，成功後即可上市發售！`, 'text-cyan font-bold');
            this.refreshElectronicsTabUI(corp);
        } else {
            app.log(`【資金不足】研發新品需要 $${app.formatMoney(cost)} 企業現金！`, 'text-red-500');
        }
    },

    // D. 品牌廠行銷活動
    doBrandMarketing(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.electronicsState) return;
        const state = corp.electronicsState;
        const cost = type === 'regional' ? 15000000 : 50000000;
        const gain = type === 'regional' ? 10 : 40;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost;
            state.brandPower = Math.min(200, state.brandPower + gain);
            const label = type === 'regional' ? '區域整合行銷' : '全球旗艦發表會';
            app.log(`【品牌行銷】📣 ${corp.name} 舉辦 [${label}]，成功提升品牌力 +${gain} 點！(當前品牌力: ${state.brandPower})`, 'text-cyan font-bold');
            this.refreshElectronicsTabUI(corp);
        } else {
            app.log(`【資金不足】行銷活動需要 $${app.formatMoney(cost)} 企業現金！`, 'text-red-500');
        }
    },

    // E. 伺服器/工控 擴充產能
    expandServerCapacity(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.electronicsState) return;
        const cost = 30000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost;
            corp.electronicsState.serverRackCapacity += 30;
            app.log(`【產能投資】🖥️ ${corp.name} 投資 $30M 擴建伺服器組裝廠房，月產能提升 +30 台！`, 'text-yellow-400 font-bold');
            this.refreshElectronicsTabUI(corp);
        } else {
            app.log(`【資金不足】擴建產能需要 $30,000,000 企業現金！`, 'text-red-500');
        }
    },

    // F. 伺服器/工控 升級認證
    upgradeServerCert(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.electronicsState) return;
        const state = corp.electronicsState;
        if (state.certLevel >= 3) { app.log('品質認證已達 MIL-SPEC 最高軍規等級！', 'text-gray-400'); return; }
        const cost = 60000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost;
            state.certLevel++;
            const certNames = ['', '基礎品質認證', 'NEBS Level 3 電信級認證', 'MIL-SPEC 軍規認證'];
            app.log(`【認證升級】🏆 ${corp.name} 取得 [${certNames[state.certLevel]}]！頂級雲端大廠與國防採購資格已解鎖，每日合約收入將大幅躍升！`, 'text-yellow-400 font-bold animate-pulse');
            // 認證升級後自動追加一份新框架合約
            if (state.cloudContracts.length < 5) {
                const newClientNames = ['Amazon AWS', 'Google GCP', 'Microsoft Azure', '國防部軍用採購署'];
                const clientName = newClientNames[Math.min(state.certLevel, newClientNames.length - 1)];
                state.cloudContracts.push({ id: `C-cert-${Date.now()}`, clientName: clientName, contractName: `${clientName} 年度採購框架合約 (認證後加簽)`, dailyRev: state.certLevel * 150000 + 80000, daysRemaining: 120 });
            }
            this.refreshElectronicsTabUI(corp);
        } else {
            app.log(`【資金不足】認證升級需要 $60,000,000 企業現金！`, 'text-red-500');
        }
    },

    // G. 零組件廠 擴充產線
    expandComponentOutput(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.electronicsState) return;
        const cost = 20000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost;
            corp.electronicsState.dailyUnitOutput += 500;
            app.log(`【產線擴建】⚙️ ${corp.name} 投資 $20M 擴建精密製程產線，日產量提升 +500 件！`, 'text-green-400 font-bold');
            this.refreshElectronicsTabUI(corp);
        } else {
            app.log(`【資金不足】擴建產線需要 $20,000,000 企業現金！`, 'text-red-500');
        }
    },

    // H. 零組件廠 提升品質認證
    upgradeComponentQuality(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.electronicsState) return;
        const state = corp.electronicsState;
        if (state.qualityRating >= 2.5) { app.log('品質因子已達業界最高上限 2.5x！', 'text-gray-400'); return; }
        const cost = 35000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost;
            state.qualityRating = parseFloat((state.qualityRating + 0.15).toFixed(2));
            app.log(`【認證升級】🏅 ${corp.name} 通過新一輪國際品質認證，品質加乘因子提升至 x${state.qualityRating}！高利潤車規與醫療客戶已解鎖！`, 'text-green-400 font-bold');
            this.refreshElectronicsTabUI(corp);
        } else {
            app.log(`【資金不足】品質認證升級需要 $35,000,000 企業現金！`, 'text-red-500');
        }
    },

    // ==========================================
    // 4. UI 強制刷新輔助函數
    // ==========================================
    refreshElectronicsTabUI(corp) {
        const contentArea = document.getElementById('ceo-content-area');
        if (!contentArea) return;
        const activeTabBtn = document.querySelector('#btn-ceo-tab-ops');
        if (activeTabBtn && activeTabBtn.classList.contains('border-red-500')) {
            const isReadOnly = !(corp.playerOwnershipPct >= 0.5 || corp.isPlayerFounded);
            this.renderElectronicsTab(corp, contentArea, isReadOnly);
        }
    },

    // ==========================================
    // 5. 日常收入結算 (processRevenue) - 由 engine.js 每日呼叫
    // ==========================================
    processRevenue(corp) {
        if (!corp.electronicsState) this.initAssets(corp);
        const state = corp.electronicsState;
        const eci = app.state.ECI || 100;

        // 第一年護航補貼因子
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let costMult = isSubsidized ? 0.5 : 1.0;

        let dailyRev = 0;
        let dailyCost = 0;

        if (corp.bizModel === 'ems') {
            // ── EMS：Backlog 逐天消化 ──
            const fillRate = Math.min(1.0, Math.max(0.2, eci / 100));
            if (state.backlog && state.backlog.length > 0) {
                state.backlog.forEach(b => { b.daysLeft--; });
                const doneOrders = state.backlog.filter(b => b.daysLeft <= 0);
                doneOrders.forEach(b => {
                    const rev = (b.revenue || b.price || 0);
                    dailyRev += rev;
                    if (rev > 0) app.log(`【代工交付】📦 ${corp.name} 完成 [${b.productName || b.type}] 代工交付，認列收入 +$${app.formatMoney(rev)}！`, 'text-blue-300');
                });
                state.backlog = state.backlog.filter(b => b.daysLeft > 0);
                // 自動生成新 Backlog（模擬穩定代工需求）
                if (state.backlog.length < 3 && Math.random() < 0.3 * fillRate) {
                    const baseRev = state.productionLines * 5000000 * (state.automationLevel / 2) * fillRate;
                    const orderLabels = { consumer_ems: '智慧終端裝置代工批次', pc_ems: '企業筆電與伺服器組裝批', automotive_ems: '車載電子系統代工案' };
                    state.backlog.push({ id: `B-auto-${Date.now()}`, clientName: '市場自動接單', productName: orderLabels[corp.productType] || '電子代工訂單', daysLeft: 10 + Math.floor(Math.random() * 10), revenue: baseRev });
                }
            } else if (state.backlog.length === 0) {
                // 無訂單時仍保有自動小額收入（維持基本產線）
                dailyRev = state.productionLines * 800000 * fillRate * (state.automationLevel / 5);
            }
            // 人工成本（自動化等級越高越低）
            dailyCost = state.productionLines * 300000 * (1 - (state.automationLevel - 1) * 0.1) * costMult;

        } else if (corp.bizModel === 'brand') {
            // ── 品牌廠：產品生命週期自然衰減，品牌力加乘 ──
            state.productPortfolio.forEach(p => {
                p.age++;
                let decay = Math.max(0.05, 1 - (p.age / 730));
                let brandMult = Math.max(0.5, state.brandPower / 100);
                let rev = p.dailyRevBase * decay * (eci / 100) * brandMult;
                let cogs = rev * 0.55; // 代工與物料成本 55%
                dailyRev += rev;
                dailyCost += cogs * costMult;
            });
            // 研發計畫倒數
            if (state.activeRnd.length > 0) {
                state.activeRnd.forEach(r => { r.daysLeft--; });
                const finished = state.activeRnd.filter(r => r.daysLeft <= 0);
                finished.forEach(r => {
                    const successRate = { handheld: 0.85, pc_laptop: 0.90, console: 0.75 };
                    if (Math.random() < (successRate[r.type] || 0.85)) {
                        state.productPortfolio.push({ id: `P-${Date.now()}`, name: r.name, type: r.type, marketShare: 0.1, dailyRevBase: r.revBase, age: 0, generation: (state.productPortfolio.length + 1) });
                        app.log(`【新品上市】🚀 ${corp.name} 全新產品 [${r.name}] 成功開發上市！即日起開始產生品牌銷售收入！`, 'text-green-400 font-bold animate-pulse');
                    } else {
                        app.log(`【研發失敗】💥 ${corp.name} [${r.name}] 研發因良率與供應鏈問題宣告失敗！研發費用全部打水漂！`, 'text-red-500 font-bold');
                    }
                });
                state.activeRnd = state.activeRnd.filter(r => r.daysLeft > 0);
                // 老舊產品淘汰（超過 730 天生命週期的過時產品移除）
                state.productPortfolio = state.productPortfolio.filter(p => p.age < 730 || p.dailyRevBase < 50000);
            }
            // 行銷維護費
            dailyCost += state.brandPower * 2000 * costMult;

        } else if (corp.bizModel === 'server_ipc') {
            // ── 伺服器/工控：框架合約每日認列收入 ──
            state.cloudContracts.forEach(c => {
                c.daysRemaining--;
                let certMult = state.certLevel * 0.5 + 0.5;
                dailyRev += c.dailyRev * certMult * (eci / 100);
            });
            // 到期合約移除
            state.cloudContracts = state.cloudContracts.filter(c => c.daysRemaining > 0);
            // 廠房折舊與維護
            dailyCost = state.serverRackCapacity * 3000 * costMult;

        } else if (corp.bizModel === 'components') {
            // ── 零組件：日產量 × 單價 × 品質加乘 × 景氣係數 ──
            dailyRev = state.dailyUnitOutput * state.unitPrice * state.qualityRating * (eci / 100);
            // 原材料與製程成本（約 35%）
            dailyCost = dailyRev * 0.35 * costMult;
        }

        // 防 NaN 保護
        if (isNaN(dailyRev)) dailyRev = 0;
        if (isNaN(dailyCost)) dailyCost = 0;

        // 寫入公司帳戶
        const netIncome = dailyRev - dailyCost;
        corp.corporateCash = (corp.corporateCash || 0) + netIncome;
        corp.monthRevenue = (corp.monthRevenue || 0) + dailyRev;
        corp.monthExpense = (corp.monthExpense || 0) + dailyCost;
        corp.cashFlowPool = (corp.cashFlowPool || 0) + netIncome;
        corp.lastDailyRev = dailyRev;
        corp.lastDailyExp = dailyCost;
    }
};

// 掛載至全域 window 以便 onclick 等 HTML 事件能存取
window.CEO_ELECTRONICS = CEO_ELECTRONICS;
