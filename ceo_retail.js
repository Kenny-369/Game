// ceo_retail.js - 百貨與零售產業（六大商業模型）核心模擬子系統
// 僅使用台灣繁體中文，嚴格防範 NaN 異常

const CEO_RETAIL = {
    // ==========================================
    // 1. 初始化資產 (Init Assets)
    // ==========================================
    initAssets(corp) {
        if (!corp.retailState) {
            corp.retailState = {
                // 通用零售狀態
                bciDailyEffect: 1.0,
                
                // 1. 連鎖超商與小超市 (cvs_minimart)
                shelfProduct: 'normal_bento', // 貨架鮮食類型: normal_bento, collab_chicken, collab_pizza
                virtualServices: [],         // 數位服務項目: game_cards, concert_tickets
                coldChainLevel: 1,           // 冷鏈物流等級 (1~3)
                storeCount: 1,               // 門市數量
                
                // 2. 倉儲量販與大賣場 (hypermarket)
                markupRate: 12,              // 商品加價率/毛利率 (5%~20%)
                memberFeeNormal: 1200,       // 一般會員年費 ($500~$3000)
                memberFeeDiamond: 3000,      // 黑鑽會員年費 ($1500~$8000)
                memberCount: 100,            // 會員總數
                diamondRatio: 0.15,          // 黑鑽高級會員佔比
                treasureHuntItem: null,      // 特賣採購案: null, fast_charger, tablet_pc
                treasureHuntDaysLeft: 0,     // 特賣採購賸餘天數
                
                // 3. 運動休閒與機能服飾 (sports_apparel)
                hypeLevel: 50,               // 市場熱度 (0~100)
                inventoryVolume: 1000,       // 庫存件數
                inventoryAge: 0,             // 庫存積壓天數
                clearanceStrategy: 'outlet', // 庫存出清策略: outlet, burn
                brandReputation: 50,         // 品牌聲譽 (0~100)
                
                // 4. 居家與美妝專門店 (specialty_home)
                privateLabelRatio: 20,       // 自有品牌陳列比重 (0%~100%)
                marketingExpense: 5000,      // 自有品牌每日推銷預算
                brandReputationSpecialty: 30,// 自有品牌聲譽 (0~100)
                skuCount: 5000,              // SKU 數量
                
                // 5. 綜合百貨與購物中心 (department_store)
                floors: {
                    f1: 'luxury_boutique',   // 樓層專櫃配置 (精品專櫃)
                    f2: 'fashion',           // 樓層專櫃配置 (時尚服飾)
                    f3: 'dining',            // 樓層專櫃配置 (人氣餐飲)
                    f4: 'home_appliance',    // 樓層專櫃配置 (居家家電)
                    f5: 'entertainment'      // 樓層專櫃配置 (影城娛樂)
                },
                anniversaryPromoBudget: 0,   // 週年慶促銷每日補貼
                anniversaryDaysLeft: 0,      // 週年慶賸餘天數
                vacancyRate: 0.05,           // 百貨商場空置率
                
                // 6. 頂級奢華與時尚精品 (luxury_brand)
                quotaRatio: 100,             // 配貨比例 (0% ~ 300%)
                artisanCount: 10,            // 手工匠人人數
                brandReputationLuxury: 50,   // 頂奢品牌聲譽神話值 (0~100)
                academyUpgraded: false,      // 手工工匠學院是否升級
                outsourced: false,           // 是否啟動外包量產
                bagInventory: 50             // 精品包在手庫存
            };
        }

        const state = corp.retailState;
        const p = corp.price || corp.basePrice || 100;
        const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;

        // 玩家創立之公司為新創空殼公司，不給予上市公司級初始資源 (依據 user_rules)
        if (corp.isPlayerFounded) {
            if (corp.bizModel === 'cvs_minimart') {
                state.storeCount = 1;
            } else if (corp.bizModel === 'hypermarket') {
                state.memberCount = 200;
            } else if (corp.bizModel === 'luxury_brand') {
                state.artisanCount = 8;
                state.brandReputationLuxury = 40;
            }
            return;
        }

        // ==========================================
        // 非玩家（上市公司）根據規模給予初始資源與設定
        // ==========================================
        
        // A. 連鎖超商與小超市 (cvs_minimart)
        if (corp.bizModel === 'cvs_minimart') {
            if (corp.id === '2912') { // 統一超
                state.storeCount = 6500 + scale * 100;
                state.coldChainLevel = 3;
                state.virtualServices = ['game_cards', 'concert_tickets'];
            } else if (corp.id === '5903') { // 全家
                state.storeCount = 4100 + scale * 80;
                state.coldChainLevel = 2;
                state.virtualServices = ['game_cards'];
            } else {
                state.storeCount = 500 + scale * 50;
            }
        }
        
        // B. 倉儲量販與大賣場 (hypermarket)
        else if (corp.bizModel === 'hypermarket') {
            if (corp.id === 'COST') { // 好市多
                state.memberCount = 1200000 + scale * 50000;
                state.markupRate = 10; // 低毛利率性價比神話
                state.diamondRatio = 0.35; // 高比例黑鑽會員
            } else if (corp.id === 'WMT') { // 沃爾瑪
                state.memberCount = 5000000 + scale * 100000;
                state.markupRate = 14;
            } else if (corp.id === 'TGT') { // 塔吉特
                state.memberCount = 1500000 + scale * 30000;
                state.markupRate = 16;
            } else {
                state.memberCount = 100000 + scale * 5000;
            }
        }
        
        // C. 運動休閒與機能服飾 (sports_apparel)
        else if (corp.bizModel === 'sports_apparel') {
            state.hypeLevel = 60 + Math.floor(Math.random() * 20);
            if (corp.id === 'NKE') { // Nike
                state.brandReputation = 90;
                state.inventoryVolume = 800000;
            } else if (corp.id === 'LULU') { // Lululemon
                state.brandReputation = 85;
                state.inventoryVolume = 300000;
            } else { // 儒鴻、聚陽、豐泰等供應鏈下游或自有服飾
                state.brandReputation = 65;
                state.inventoryVolume = 150000;
            }
        }
        
        // D. 居家與美妝專門店 (specialty_home)
        else if (corp.bizModel === 'specialty_home') {
            if (corp.id === '5904') { // 寶雅
                state.skuCount = 45000;
                state.privateLabelRatio = 25;
                state.brandReputationSpecialty = 60;
            } else if (corp.id === 'HD') { // Home Depot
                state.skuCount = 35000;
                state.privateLabelRatio = 15;
                state.brandReputationSpecialty = 70;
            } else { // 特力
                state.skuCount = 20000;
                state.privateLabelRatio = 10;
                state.brandReputationSpecialty = 50;
            }
        }
        
        // E. 綜合百貨與購物中心 (department_store)
        else if (corp.bizModel === 'department_store') {
            state.floors = {
                f1: 'luxury_boutique',
                f2: 'fashion',
                f3: 'dining',
                f4: 'dining',
                f5: 'entertainment'
            };
            state.vacancyRate = 0.03;
        }
        
        // F. 頂級奢華與時尚精品 (luxury_brand)
        else if (corp.bizModel === 'luxury_brand') {
            if (corp.id === 'RMS') { // 愛馬仕
                state.brandReputationLuxury = 98;
                state.artisanCount = 120 + scale * 5;
                state.quotaRatio = 150; // 經典配貨 1.5 倍比
                state.bagInventory = 400;
            } else if (corp.id === 'MC') { // LVMH
                state.brandReputationLuxury = 92;
                state.artisanCount = 250 + scale * 10;
                state.quotaRatio = 80;
                state.bagInventory = 1200;
            } else {
                state.brandReputationLuxury = 70;
                state.artisanCount = 30;
                state.bagInventory = 100;
            }
        }
    },

    // ==========================================
    // 2. UI 渲染派發 (Render)
    // ==========================================
    renderRetailTab(corp, contentArea, isReadOnly) {
        if (!corp.retailState) this.initAssets(corp);
        let html = `<div class="p-4 bg-black border border-gray-800 rounded crt">`;
        
        let rti = app.state.RTI || 100; // 百貨零售大眾消費指數 (RTI)，如果沒有就預設 100
        let bciColor = rti >= 100 ? 'text-green-400 font-bold' : 'text-red-400 font-bold';
        
        // 頂部全域景氣與政策補貼橫幅
        html += `<div class="mb-4 text-xs text-gray-300 bg-gray-900 bg-opacity-80 p-3 rounded border border-gray-800 flex justify-between items-center shadow-[inset_0_0_10px_rgba(0,255,0,0.05)]">
            <div>📊 百貨與大眾零售消費指數 (RTI): <span class="${bciColor}">${rti.toFixed(1)}%</span></div>
            <div class="text-xs text-gray-400">※ 影響實體客流量、客單價加成以及消費者買氣。</div>
        </div>`;

        // 國家青年內需提振補貼方案（自創或上市初期護航）
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        if (isFirstYearSubsidized) {
            html += `<div class="mb-4 text-xs bg-green-950 bg-opacity-30 p-3 rounded border border-green-700 text-green-400 flex flex-col gap-1 shadow-[0_0_15px_rgba(0,255,0,0.1)] animate-pulse">
                <div class="font-bold flex items-center gap-1.5">🟢 國家振興內需特別條例法案生效中 (創立/上市前三個月特別護航)</div>
                <div class="text-xs text-gray-300">※ 享有：日常行政、折舊、店租與物流維護費減免 50% 政策補貼。</div>
                <div class="text-xs text-gray-300">※ 享有：特許輔助，每日額外撥發國家振興實體零售輔助款！</div>
            </div>`;
        }

        // 根據 business model 進行 UI 分流
        if (corp.bizModel === 'cvs_minimart') {
            html += this.renderCvsUI(corp, isReadOnly);
        } else if (corp.bizModel === 'hypermarket') {
            html += this.renderHypermarketUI(corp, isReadOnly);
        } else if (corp.bizModel === 'sports_apparel') {
            html += this.renderSportsUI(corp, isReadOnly);
        } else if (corp.bizModel === 'specialty_home') {
            html += this.renderSpecialtyUI(corp, isReadOnly);
        } else if (corp.bizModel === 'department_store') {
            html += this.renderDepartmentUI(corp, isReadOnly);
        } else if (corp.bizModel === 'luxury_brand') {
            html += this.renderLuxuryUI(corp, isReadOnly);
        }
        
        html += `</div>`;
        contentArea.innerHTML = html;
    },

    // ==========================================
    // 2-A. 連鎖超商與小超市 (cvs_minimart) UI
    // ==========================================
    renderCvsUI(corp, isReadOnly) {
        const state = corp.retailState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-cyan font-bold mb-2 text-md flex items-center gap-1">🏪 連鎖超商與小超市 (Convenience/Mini-Mart)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">超商是高頻低消的流量入口。鮮食毛利率極高，但保存期限短，考驗冷鏈物流中心的配送頻率，極力控制報廢率是唯一的獲利密碼；數位點數與演唱會門票則是「無本手續費分成」的黃金副業！</p>`;

        // A. 基本資產面板
        html += `<div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">全台門市總數</div>
                <div class="text-cyan font-mono font-bold text-lg mt-0.5">${state.storeCount.toLocaleString()} 家</div>
            </div>
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">冷鏈物流中心等級</div>
                <div class="text-yellow-400 font-bold text-xs mt-1">
                    ${state.coldChainLevel === 3 ? '🥇 頂級冷鏈 (日配3次)' : (state.coldChainLevel === 2 ? '🥈 優良冷鏈 (日配2次)' : '🥉 基礎物流 (日配1次)')}
                </div>
            </div>
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">黃金貨架鮮食商品</div>
                <div class="text-green-400 font-bold text-xs mt-1">
                    ${state.shelfProduct === 'collab_chicken' ? '🍗 聯名韓式炸雞便當' : (state.shelfProduct === 'collab_pizza' ? '🍕 聯名手作披薩' : '🍱 一般國民鐵路便當')}
                </div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 營運決策
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">🛒 黃金貨架鮮食上架決策 (Shelf Product Management)</h4>`;
            html += `<div class="grid grid-cols-3 gap-2 mb-4">
                <button onclick="CEO_RETAIL.setShelfProduct('${corp.id}', 'normal_bento')" class="bg-gray-900 hover:bg-gray-800 p-2.5 rounded border ${state.shelfProduct === 'normal_bento' ? 'border-cyan font-bold bg-cyan-950 bg-opacity-20' : 'border-gray-800'} text-left text-xs transition">
                    <div class="text-white">🍱 國民鐵路便當</div>
                    <div class="text-gray-400 mt-1">毛利率: <span class="text-green-400">35%</span></div>
                    <div class="text-gray-400">基礎報廢率: <span class="text-green-400">10%</span></div>
                </button>
                <button onclick="CEO_RETAIL.setShelfProduct('${corp.id}', 'collab_chicken')" class="bg-gray-900 hover:bg-gray-800 p-2.5 rounded border ${state.shelfProduct === 'collab_chicken' ? 'border-yellow-500 font-bold bg-yellow-950 bg-opacity-20' : 'border-gray-800'} text-left text-xs transition">
                    <div class="text-yellow-400">🍗 聯名韓式炸雞</div>
                    <div class="text-gray-400 mt-1">毛利率: <span class="text-green-400">45%</span></div>
                    <div class="text-gray-400">基礎報廢率: <span class="text-red-400">25%</span></div>
                </button>
                <button onclick="CEO_RETAIL.setShelfProduct('${corp.id}', 'collab_pizza')" class="bg-gray-900 hover:bg-gray-800 p-2.5 rounded border ${state.shelfProduct === 'collab_pizza' ? 'border-purple-500 font-bold bg-purple-950 bg-opacity-20' : 'border-gray-800'} text-left text-xs transition">
                    <div class="text-purple-400">🍕 聯名手作披薩</div>
                    <div class="text-gray-400 mt-1">毛利率: <span class="text-green-400">40%</span></div>
                    <div class="text-gray-400">基礎報廢率: <span class="text-red-400">20%</span></div>
                </button>
            </div>`;

            // C. 冷鏈與展店決策
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">🚚 冷鏈物流優化與超商展店 (Cold-Chain & Expansion CapEx)</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            
            let chainUpgrade2Cost = isFirstYearSubsidized ? 24000000 : 30000000;
            let chainUpgrade3Cost = isFirstYearSubsidized ? 80000000 : 100000000;
            let store10Cost = isFirstYearSubsidized ? 16000000 : 20000000;

            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-cyan text-xs">🚚 升級區域冷鏈配送網絡</div>
                        <p class="text-[11px] text-gray-400 mt-1">升級後可增加每日配送鮮食的頻次，確保食材極度新鮮，大幅扣減鮮食報廢比率！</p>
                    </div>
                    ${state.coldChainLevel === 1 ? `
                        <button onclick="CEO_RETAIL.upgradeColdChain('${corp.id}', 2)" class="btn-retro py-1.5 mt-3 text-xs border-cyan text-cyan font-bold transition">
                            升級至 Lv 2 優良冷鏈 (-$${app.formatMoney(chainUpgrade2Cost)})
                        </button>
                    ` : (state.coldChainLevel === 2 ? `
                        <button onclick="CEO_RETAIL.upgradeColdChain('${corp.id}', 3)" class="btn-retro py-1.5 mt-3 text-xs border-yellow-500 text-yellow-500 font-bold transition">
                            升級至 Lv 3 旗艦冷鏈 (-$${app.formatMoney(chainUpgrade3Cost)})
                        </button>
                    ` : `
                        <button disabled class="btn-retro py-1.5 mt-3 text-xs border-gray-800 text-gray-600 font-bold transition cursor-not-allowed">
                            已達最高 Lv 3 物流網
                        </button>
                    `)}
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">🏪 超大規模快速展店</div>
                        <p class="text-[11px] text-gray-400 mt-1">在全台住宅區與辦公區快速鋪設 10 家全新門市！大幅拉抬基礎流量，店租折舊費用隨之增加。</p>
                    </div>
                    <button onclick="CEO_RETAIL.expandStores('${corp.id}', 10)" class="btn-retro py-1.5 mt-3 text-xs border-green-500 text-green-400 font-bold transition">
                        擴張 10 家新門市 (-$${app.formatMoney(store10Cost)})
                    </button>
                </div>
            </div>`;

            // D. 虛擬代收服務引進
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">🎟️ 數位虛擬代收與第三方手續費服務 (Virtual Services)</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <p class="text-xs text-gray-400 mb-3.5">引進多媒體機台，無任何物流與庫存成本，依靠全省超商流量，穩賺手續費分成收入！</p>
                <div class="grid grid-cols-2 gap-3 text-xs">
                    <button onclick="CEO_RETAIL.toggleVirtualService('${corp.id}', 'game_cards')" class="btn-retro py-1.5 ${state.virtualServices.includes('game_cards') ? 'border-green-500 text-green-400 bg-green-950 bg-opacity-20 font-bold' : 'border-cyan text-cyan'}">
                        ${state.virtualServices.includes('game_cards') ? '🟢 已引進 Steam/PSN 點數卡' : '➕ 引進 Steam/PSN 點數卡 (手續費 5%)'}
                    </button>
                    <button onclick="CEO_RETAIL.toggleVirtualService('${corp.id}', 'concert_tickets')" class="btn-retro py-1.5 ${state.virtualServices.includes('concert_tickets') ? 'border-green-500 text-green-400 bg-green-950 bg-opacity-20 font-bold' : 'border-cyan text-cyan'}">
                        ${state.virtualServices.includes('concert_tickets') ? '🟢 已引進 演唱會與賽事門票' : '➕ 引進 演唱會與賽事門票 (手續費 $20/張)'}
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-B. 倉儲量販與大賣場 (hypermarket) UI
    // ==========================================
    renderHypermarketUI(corp, isReadOnly) {
        const state = corp.retailState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-yellow-400 font-bold mb-2 text-md">🛒 倉儲量販與大賣場 (Hypermarket/Big Box)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">大賣場極致壓低商品利潤以回饋性價比。核心商業機密是收取穩定的「會員費訂閱收入」。商品加價率越低，顧客辦卡熱度越高；每季更能開啟尋寶特賣引流！</p>`;

        // A. 狀態儀表板
        html += `<div class="grid grid-cols-3 gap-2.5 mb-5 text-center">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">會員卡持有數</div>
                <div class="text-yellow-400 font-mono font-bold text-md mt-0.5">${state.memberCount.toLocaleString()} 人</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">商品毛利率 (加價比)</div>
                <div class="text-cyan font-mono font-bold text-md mt-0.5">${state.markupRate}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">黑鑽卡會員佔比</div>
                <div class="text-purple-400 font-bold text-xs mt-1">${(state.diamondRatio*100).toFixed(0)}%</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 會員與加價拉桿
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-500 pl-1.5">⚖️ 商品定價加價與會員年費控制</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-yellow-800 border-opacity-40 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] space-y-4">
                <div>
                    <div class="flex justify-between text-xs text-gray-300 mb-1">
                        <span>🏷️ 商品定價加價率 (加碼毛利率)：</span>
                        <span class="text-cyan font-bold" id="label-val-markup">${state.markupRate}% (加碼定價)</span>
                    </div>
                    <div class="flex gap-2 items-center">
                        <input type="range" min="5" max="20" step="1" value="${state.markupRate}" 
                               onchange="CEO_RETAIL.changeMarkupRate('${corp.id}', this.value)"
                               oninput="document.getElementById('label-val-markup').innerText = this.value + '% (加碼定價)'"
                               class="w-full cursor-pointer accent-cyan-500">
                    </div>
                    <span class="text-[10px] text-gray-400">※ 商品加價率越低（如 Costco 模式 10%），商品賣越便宜，辦卡辦會人數成長呈幾何倍增；超過 15% 會使辦卡意願大幅滑落。</span>
                </div>
                <div class="grid grid-cols-2 gap-4 pt-2 border-t border-gray-900">
                    <div>
                        <div class="flex justify-between text-[11px] text-gray-400 mb-1">
                            <span>💳 一般卡年費</span>
                            <span class="text-yellow" id="label-val-normal-fee">$${state.memberFeeNormal}</span>
                        </div>
                        <input type="range" min="500" max="3000" step="100" value="${state.memberFeeNormal}" 
                               onchange="CEO_RETAIL.changeMemberFee('${corp.id}', 'normal', this.value)"
                               oninput="document.getElementById('label-val-normal-fee').innerText = '$' + this.value"
                               class="w-full cursor-pointer accent-yellow-500">
                    </div>
                    <div>
                        <div class="flex justify-between text-[11px] text-gray-400 mb-1">
                            <span>👑 黑鑽高級年費</span>
                            <span class="text-purple-400" id="label-val-diamond-fee">$${state.memberFeeDiamond}</span>
                        </div>
                        <input type="range" min="1500" max="8000" step="200" value="${state.memberFeeDiamond}" 
                               onchange="CEO_RETAIL.changeMemberFee('${corp.id}', 'diamond', this.value)"
                               oninput="document.getElementById('label-val-diamond-fee').innerText = '$' + this.value"
                               class="w-full cursor-pointer accent-purple-500">
                    </div>
                </div>
            </div>`;

            // C. 尋寶特賣採購案
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-500 pl-1.5">💎 尋寶商品破盤採購特賣 (Treasure Hunt Sourcing)</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <p class="text-xs text-gray-400 mb-3.5">每 90 天可執行一次短期特賣案。以破天荒的震撼超低價在賣場中間堆放熱門電子產品，吸引全省大排長龍！</p>
                <div class="grid grid-cols-2 gap-3 text-xs mb-3">
                    <button onclick="CEO_RETAIL.startTreasureHunt('${corp.id}', 'fast_charger')" class="bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-yellow-900 text-left transition hover:border-yellow-500">
                        <div class="font-bold text-yellow">⚡ 引進大容量 PD 氮化鎵快充頭</div>
                        <div class="text-[10px] text-gray-400 mt-1">採購預算: -$3,000,000</div>
                        <div class="text-[10px] text-green-400 font-bold">預估效益: 賣場客流 (Foot Traffic) +35%</div>
                    </button>
                    <button onclick="CEO_RETAIL.startTreasureHunt('${corp.id}', 'tablet_pc')" class="bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-purple-900 text-left transition hover:border-purple-500">
                        <div class="font-bold text-purple-400">📱 採購 11 吋大尺寸安卓平價平板</div>
                        <div class="text-[10px] text-gray-400 mt-1">採購預算: -$8,000,000</div>
                        <div class="text-[10px] text-green-400 font-bold">預估效益: 賣場客流 (Foot Traffic) +65%</div>
                    </button>
                </div>
                ${state.treasureHuntDaysLeft > 0 ? `
                    <div class="text-center text-xs text-yellow animate-pulse font-bold bg-yellow-950 bg-opacity-20 border border-yellow-800 p-2 rounded">
                        🔥 尋寶商品特賣熱烈進行中！特賣專案賸餘: ${state.treasureHuntDaysLeft} 天
                    </div>
                ` : `
                    <div class="text-center text-xs text-gray-500 border border-dashed border-gray-800 p-2 rounded">
                        目前未開啟特賣採購案。可隨時支付資金開啟專案。
                    </div>
                `}
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-C. 運動休閒與機能服飾 (sports_apparel) UI
    // ==========================================
    renderSportsUI(corp, isReadOnly) {
        const state = corp.retailState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-green-400 font-bold mb-2 text-md">👟 運動休閒與機能服飾 (Sports & Activewear)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">服飾與球鞋是由「潮流溢價」與「庫存生命週期」雙重驅動。安排發售限量抽籤 (Drop) 能引爆潮流熱度，但要防範換季時的滯銷庫存，否則龐大的倉儲成本會直接拖垮公司！</p>`;

        // A. 狀態
        html += `<div class="grid grid-cols-3 gap-2.5 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">當季庫存量</div>
                <div class="text-green-400 font-mono font-bold mt-0.5">${state.inventoryVolume.toLocaleString()} 件</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">市場潮流熱度 (Hype)</div>
                <div class="text-yellow font-bold mt-0.5 animate-pulse">${state.hypeLevel.toFixed(1)} / 100</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">品牌名聲形象</div>
                <div class="text-cyan font-mono font-bold mt-0.5">${state.brandReputation.toFixed(0)}</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 限量 Drop 檔期安排
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">🔥 安排發售檔期 (Drop Culture)</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            
            let raffleCost = isFirstYearSubsidized ? 4000000 : 5000000;
            let massCost = isFirstYearSubsidized ? 12000000 : 15000000;

            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <button onclick="CEO_RETAIL.scheduleDrop('${corp.id}', 'hype_raffle')" class="bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-yellow-900 text-left transition hover:border-yellow-500">
                    <div class="font-bold text-yellow">👟 限量神鞋「聯名抽籤 Raffle」發售</div>
                    <div class="text-[10px] text-gray-400 mt-1">發行成本: -$${app.formatMoney(raffleCost)} | 銷量有限但價格極致</div>
                    <div class="text-[10px] text-green-400 font-bold mt-1">效益: 品牌潮流 Hype 大幅暴增 +30！</div>
                </button>
                <button onclick="CEO_RETAIL.scheduleDrop('${corp.id}', 'mass_retail')" class="bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-green-950 text-left transition hover:border-green-400">
                    <div class="font-bold text-green-400">👕 全省大量常規機能服飾「鋪貨」</div>
                    <div class="text-[10px] text-gray-400 mt-1">發行成本: -$${app.formatMoney(massCost)} | 大批量生產與銷售</div>
                    <div class="text-[10px] text-green-400 font-bold mt-1">效益: 認列天額銷售分成，但降低潮流稀缺性。</div>
                </button>
            </div>`;

            // C. 過季庫存清理 (Clearance)
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">📦 換季庫存與滯銷清倉決策</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <p class="text-xs text-gray-400 mb-3.5">換季賣不掉的服飾會堆積在倉庫，產生龐大的倉儲租金。請選擇出清方式：</p>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="CEO_RETAIL.clearInventory('${corp.id}', 'outlet')" class="btn-retro py-2 text-xs border-yellow text-yellow hover:bg-yellow-950 bg-opacity-20 font-bold transition">
                        🏬 傾倒至 Outlet 兩折出清 (回收40%工本現金，品牌形象扣減 -15)
                    </button>
                    <button onclick="CEO_RETAIL.clearInventory('${corp.id}', 'burn')" class="btn-retro py-2 text-xs border-red-500 text-red-500 hover:bg-red-950 bg-opacity-20 font-bold transition">
                        🔥 送入焚化爐直接銷毀 (認列全額庫存虧損，維持品牌尊榮形象)
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-D. 居家與美妝專門店 (specialty_home) UI
    // ==========================================
    renderSpecialtyUI(corp, isReadOnly) {
        const state = corp.retailState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-purple-400 font-bold mb-2 text-md">💄 居家與美妝專門店 (Specialty/Home)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">專門店靠著成千上萬的 SKU 進行目的性零售。進口國際大牌能吸引客流量，但毛利低；投入資金行銷並陳列「自有品牌 (Private Label)」，能讓商品毛利瞬間翻倍！</p>`;

        // A. 狀態
        html += `<div class="grid grid-cols-3 gap-2.5 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">總販售品項 (SKU)</div>
                <div class="text-purple-400 font-mono font-bold mt-0.5">${state.skuCount.toLocaleString()} 種</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">自有品牌陳列比例</div>
                <div class="text-yellow font-bold mt-0.5">${state.privateLabelRatio}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">自有品牌聲譽名聲</div>
                <div class="text-cyan font-mono font-bold mt-0.5">${state.brandReputationSpecialty.toFixed(0)} / 100</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 自有品牌滑桿與行銷預算
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">🏷️ 自有品牌 (Private Label) 陳列與推廣設定</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-purple-800 border-opacity-40 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] space-y-4">
                <div>
                    <div class="flex justify-between text-xs text-gray-300 mb-1">
                        <span>🏷️ 門市自有商品陳列比重：</span>
                        <span class="text-yellow font-bold" id="label-val-privateratio">${state.privateLabelRatio}%</span>
                    </div>
                    <div class="flex gap-2 items-center">
                        <input type="range" min="0" max="100" step="5" value="${state.privateLabelRatio}" 
                               onchange="CEO_RETAIL.changePrivateLabelRatio('${corp.id}', this.value)"
                               oninput="document.getElementById('label-val-privateratio').innerText = this.value + '%'"
                               class="w-full cursor-pointer accent-yellow-500">
                    </div>
                    <span class="text-[10px] text-gray-400">※ 國際大廠代理品吸引流量但毛利率僅 20%；自有品牌商品利潤毛利率高達 60%！但極端考驗自家品牌名聲與行銷預算。</span>
                </div>
                
                <div class="pt-3 border-t border-gray-900">
                    <div class="flex justify-between text-xs text-gray-300 mb-1">
                        <span>📢 自有品牌每日行銷與研發維持費：</span>
                        <span class="text-cyan font-bold" id="label-val-mkt-exp">$${app.formatMoney(state.marketingExpense)}/日</span>
                    </div>
                    <input type="range" min="1000" max="50000" step="1000" value="${state.marketingExpense}" 
                           onchange="CEO_RETAIL.changeMarketingExpense('${corp.id}', this.value)"
                           oninput="document.getElementById('label-val-mkt-exp').innerText = '$' + app.formatMoney(this.value) + '/日'"
                           class="w-full cursor-pointer accent-cyan-500">
                    <span class="text-[10px] text-gray-400">※ 每日投入金額越高，自有品牌的名聲將會逐日大幅提升，吸引專門店消費者購買自有商品，提升銷路轉換！</span>
                </div>
            </div>`;

            // C. 商品 SKU 擴增
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">📦 擴大商品 SKU 庫存多樣性 (Expand SKU Base)</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            
            let sku5000Cost = isFirstYearSubsidized ? 8000000 : 10000000;

            html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] flex justify-between items-center">
                <div>
                    <div class="font-bold text-green-400 text-xs">📦 擴充 5,000 種全新 SKU 品項</div>
                    <p class="text-[10px] text-gray-400 mt-1">增加美妝小配件或居家五金零件，大幅增加門市的目的性消費來客數！每日基礎維運成本微幅增加。</p>
                </div>
                <button onclick="CEO_RETAIL.expandSKU('${corp.id}', 5000)" class="btn-retro px-3 py-1.5 text-xs border-green-500 text-green-400 font-bold transition">
                    擴增 SKU (-$${app.formatMoney(sku5000Cost)})
                </button>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-E. 綜合百貨與購物中心 (department_store) UI
    // ==========================================
    renderDepartmentUI(corp, isReadOnly) {
        const state = corp.retailState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-white font-bold mb-2 text-md flex items-center gap-1">🏢 綜合百貨與購物中心 (Department Store)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">綜合百貨是不折不扣的「地產收租與抽成巨頭」。靠著引進知名連鎖餐飲帶來恐怖的基礎客流量 (Foot Traffic)，再靠名牌精品專櫃賺取高額營業額抽成分成！</p>`;

        // A. 基本狀態
        html += `<div class="grid grid-cols-2 gap-3 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">商場專櫃空置率</div>
                <div class="text-green-400 font-mono font-bold text-md mt-0.5">${(state.vacancyRate*100).toFixed(1)}%</div>
            </div>
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">週年慶補貼預算</div>
                <div class="text-yellow font-bold text-md mt-0.5">$${app.formatMoney(state.anniversaryPromoBudget)}/日</div>
            </div>
        </div>`;

        // B. 樓層配置表
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-white pl-1.5">🏛️ 商場樓層專櫃招商圖 (Floor Layout)</h4>`;
        html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] text-xs space-y-2.5">`;
        
        const tenantNames = {
            'luxury_boutique': '👜 名牌精品專櫃 (租金低 | 營業額抽成高達 18% | 依賴高人流)',
            'dining': '🍔 連鎖人氣餐飲 (租金低 | 抽成 5% | 提振全百貨 +25% 客流量！)',
            'entertainment': '🎬 影城娛樂中心 (租金高 | 抽成 8% | 穩定人潮與租金)',
            'fashion': '👗 精品時尚服飾 (租金中等 | 抽成 12%)',
            'home_appliance': '📺 居家家電大廠 (租金中等 | 抽成 10%)'
        };

        Object.entries(state.floors).forEach(([flKey, flVal]) => {
            let selectHtml = '';
            if (!isReadOnly) {
                selectHtml = `<select onchange="CEO_RETAIL.changeFloorTenant('${corp.id}', '${flKey}', this.value)" class="bg-black border border-gray-800 text-[10px] text-white p-1 rounded focus:border-cyan">
                    <option value="luxury_boutique" ${flVal === 'luxury_boutique' ? 'selected' : ''}>精品專櫃 (抽成18%)</option>
                    <option value="dining" ${flVal === 'dining' ? 'selected' : ''}>人氣餐飲 (+25%人流)</option>
                    <option value="entertainment" ${flVal === 'entertainment' ? 'selected' : ''}>影城娛樂 (高固定租)</option>
                    <option value="fashion" ${flVal === 'fashion' ? 'selected' : ''}>時尚服飾 (抽成12%)</option>
                    <option value="home_appliance" ${flVal === 'home_appliance' ? 'selected' : ''}>居家家電 (抽成10%)</option>
                </select>`;
            } else {
                selectHtml = `<span class="text-cyan font-bold text-[10px] bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">已招商</span>`;
            }

            html += `<div class="flex justify-between items-center border-b border-gray-900 pb-2 last:border-0 last:pb-0">
                <div>
                    <span class="text-white font-mono font-bold">${flKey.toUpperCase()} 樓層：</span>
                    <span class="text-gray-300 text-[11px]">${tenantNames[flVal]}</span>
                </div>
                <div>${selectHtml}</div>
            </div>`;
        });
        html += `</div>`;

        if (!isReadOnly) {
            // C. 週年慶與促銷預算
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-white pl-1.5">🎉 年度第四季黃金「週年慶」檔期與促銷補貼 (Mega Campaign)</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <p class="text-xs text-gray-400 mb-3.5">週年慶是百貨單月營收大爆發的最強印鈔機！設定每日的「滿千送百」等大額行銷補貼，補貼越猛烈，週年慶單月人氣與抽成營業額會呈 3 ~ 6 倍恐怖噴發！</p>
                <div class="flex gap-4 items-center">
                    <input type="range" min="0" max="200000" step="10000" value="${state.anniversaryPromoBudget}" 
                           onchange="CEO_RETAIL.changeAnniversaryBudget('${corp.id}', this.value)"
                           oninput="document.getElementById('label-val-annipromo').innerText = '$' + app.formatMoney(this.value) + '/日'; document.getElementById('label-val-annihype').innerText = (1 + this.value / 40000).toFixed(1) + ' 倍'"
                           class="w-2/3 cursor-pointer accent-white">
                    <div class="text-[11px] text-gray-300 font-mono">
                         <div>行銷補貼: <span id="label-val-annipromo" class="text-yellow font-bold">$${app.formatMoney(state.anniversaryPromoBudget)}/日</span></div>
                         <div>客流額外增幅: <span id="label-val-annihype" class="text-green-400 font-bold">${(1 + state.anniversaryPromoBudget / 40000).toFixed(1)} 倍</span></div>
                    </div>
                </div>
                ${state.anniversaryDaysLeft > 0 ? `
                    <div class="text-center text-xs text-red-400 font-bold bg-red-950 bg-opacity-20 border border-red-800 p-2 rounded mt-3 animate-pulse">
                        🔥 狂歡週年慶大促銷進行中！倒數計時賸餘: ${state.anniversaryDaysLeft} 天！(全館抽成與客流量呈現瘋狂噴發！)
                    </div>
                ` : `
                    <div class="text-center text-xs text-gray-500 border border-dashed border-gray-800 p-2 rounded mt-3">
                        週年慶目前未啟動。每年十月自動觸發，或者您可以在 CEO 面板手動耗資提早啟動。
                    </div>
                `}
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-F. 頂級奢華與時尚精品 (luxury_brand) UI
    // ==========================================
    renderLuxuryUI(corp, isReadOnly) {
        const state = corp.retailState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-yellow-500 font-bold mb-2 text-md">👜 頂級奢華與時尚精品 (Luxury & High Fashion)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">奢侈品牌的溢價源於對「絕對稀缺性」的品牌神話維護。手工包袋的產能受到工匠大師的物理限制。玩家可以使用「配貨比例」拉高客單價；然而一旦飲鴆止渴外包大量工業化生產，品牌神話將瞬間崩潰！</p>`;

        // A. 狀態
        html += `<div class="grid grid-cols-4 gap-2.5 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">品牌神話值</div>
                <div class="text-yellow-500 font-mono font-bold mt-0.5 animate-pulse">${state.brandReputationLuxury.toFixed(1)} / 100</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">手工匠人人數</div>
                <div class="text-cyan font-bold mt-0.5">${state.artisanCount} 名</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">當前配貨比例</div>
                <div class="text-purple-400 font-mono font-bold mt-0.5">${state.quotaRatio}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">限量手袋在手機庫</div>
                <div class="text-green-400 font-bold mt-0.5">${state.bagInventory} 個</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 配貨拉桿
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-600 pl-1.5">⚖️ 精品經典「配貨比例」定價控制 (Quota & Bundling)</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-yellow-800 border-opacity-40 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="flex justify-between text-xs text-gray-300 mb-1">
                    <span>⚖️ 限量皮件購買配貨比：</span>
                    <span class="text-yellow-500 font-bold" id="label-val-quota">${state.quotaRatio}% (配貨額度)</span>
                </div>
                <div class="flex gap-4 items-center">
                    <input type="range" min="0" max="300" step="10" value="${state.quotaRatio}" 
                           onchange="CEO_RETAIL.changeQuotaRatio('${corp.id}', this.value)"
                           oninput="document.getElementById('label-val-quota').innerText = this.value + '% (配貨額度)'; document.getElementById('label-val-quotamsg').innerText = this.value === 0 ? '無限制購買' : '想買包包必須加購價值大約 ' + this.value + '% 的絲巾、香水等滯銷品'"
                           class="w-2/3 cursor-pointer accent-yellow-600">
                    <div class="text-[10px] text-gray-400 font-mono flex-1">
                         <span id="label-val-quotamsg">想買包包必須加購價值大約 ${state.quotaRatio}% 的絲巾與香水</span>
                    </div>
                </div>
                <span class="text-[10px] text-gray-500 block mt-2">※ 配貨比越高，客單價與利潤呈暴利跳升；但若品牌聲譽小於 80 時，拉高配貨比會讓顧客大反彈，大幅扣減客流量！</span>
            </div>`;

            // C. 匠人升級與培訓
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-600 pl-1.5">📿 手工大師匠人培訓與工藝擴產</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            
            let train10Cost = isFirstYearSubsidized ? 12000000 : 15000000;
            let academyCost = isFirstYearSubsidized ? 64000000 : 80000000;

            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-cyan text-xs">🎓 擴建頂級「手工工匠學院」</div>
                        <p class="text-[10px] text-gray-400 mt-1">擴大培養歐洲大師工藝。建成後，工藝與材料升級，品牌神話基礎值永久額外獲得 +10 點防禦力，且匠人招聘效率提升！</p>
                    </div>
                    ${!state.academyUpgraded ? `
                        <button onclick="CEO_RETAIL.upgradeAcademy('${corp.id}')" class="btn-retro py-1.5 mt-3 text-xs border-cyan text-cyan font-bold transition">
                            建立工匠學院 (-$${app.formatMoney(academyCost)})
                        </button>
                    ` : `
                        <button disabled class="btn-retro py-1.5 mt-3 text-xs border-gray-800 text-gray-600 font-bold cursor-not-allowed">
                            工匠學院已建立 (享神話防禦力+10)
                        </button>
                    `}
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">🧵 招募並培訓 10 名高級手工大師</div>
                        <p class="text-[10px] text-gray-400 mt-1">招募擁有 20 年針線皮件縫製經驗的老匠人。每增加 5 名工匠，每日高端限量包產能上限 +1 個。每日工資與折舊成本隨之上升。</p>
                    </div>
                    <button onclick="CEO_RETAIL.recruitArtisans('${corp.id}', 10)" class="btn-retro py-1.5 mt-3 text-xs border-green-500 text-green-400 font-bold transition">
                        培訓 10 名工匠 (-$${app.formatMoney(train10Cost)})
                    </button>
                </div>
            </div>`;

            // D. 外包量產決策 (Outsource)
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-600 pl-1.5">⚠️ 飲鴆止渴的資本誘惑：外包工業化量產 (Industrial Mass Production)</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <p class="text-xs text-gray-400 mb-3.5">啟動後，高端限量包不再侷限於匠人手工縫製，而是全面外包給低成本工業流水線。**高端產能上限瞬間爆發 10 倍，營收與利潤成倍噴發**！</p>
                <div class="flex justify-between items-center bg-black p-2 border border-red-900 mb-3">
                    <span class="text-red-400 text-[10px] font-bold">🚫 致命副作用：流水線生產將摧毀愛馬仕與路易威登立足的神格化稀缺性，品牌神話聲譽每日遭受 -0.8% 毀滅性扣減！若聲譽低於 60 點，品牌溢價神話永久破滅，所有商品售價腰斬跌落 50%！</span>
                </div>
                <div class="text-center">
                    <button onclick="CEO_RETAIL.toggleOutsource('${corp.id}')" class="btn-retro px-6 py-2 text-xs border-red-500 text-red-500 hover:bg-red-950 bg-opacity-20 font-bold transition animate-pulse">
                        ${state.outsourced ? '🚫 停止外包，回歸純手工匠人縫製 (重塑聲譽)' : '💀 啟動工業流水線外包量產 (追求百億利潤)'}
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 3. 玩家操作互動 (Actions)
    // ==========================================
    
    // 超商 Action: 設定貨架商品
    setShelfProduct(corpId, prod) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;
        corp.retailState.shelfProduct = prod;
        app.log(`【超商貨架調整】${corp.name} 黃金貨架主打鮮食更換為 [${prod === 'collab_chicken' ? '🍗 聯名韓式炸雞' : (prod === 'collab_pizza' ? '🍕 聯名手作披薩' : '🍱 鐵路便當')}]。`, "text-cyan");
        this.refreshRetailTabUI(corp);
    },

    // 超商 Action: 升級冷鏈物流
    upgradeColdChain(corpId, level) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;
        
        let cost = level === 2 ? 30000000 : 100000000;
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            corp.retailState.coldChainLevel = level;
            let subMsg = isFirstYearSubsidized ? ` (獲振興內需法案 20% 研發擴展補貼減免)` : '';
            app.log(`【冷鏈網絡升級】${corp.name} 斥資 $${app.formatMoney(finalCost)}${subMsg} 成功將冷鏈升級至等級 ${level}！鮮食報廢率大幅降低。`, "text-cyan font-bold");
            this.refreshRetailTabUI(corp);
        } else {
            app.log(`【資金不足】升級冷鏈物流中心需要 $${app.formatMoney(finalCost)} 的現金儲備！`, "text-red-500");
        }
    },

    // 超商 Action: 展店
    expandStores(corpId, count) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;

        let cost = 20000000;
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            corp.retailState.storeCount += count;
            let subMsg = isFirstYearSubsidized ? ` (享青年展店特別法案補貼 20% 資金大額減免)` : '';
            app.log(`【超商展店擴張】${corp.name} 斥資 $${app.formatMoney(finalCost)}${subMsg} 順利在全省繁華重劃區增設了 ${count} 家全新超商門市！日常流量大幅上升。`, "text-green-400 font-bold");
            this.refreshRetailTabUI(corp);
        } else {
            app.log(`【資金不足】超商大批量擴張需要 $${app.formatMoney(finalCost)} 現金！`, "text-red-500");
        }
    },

    // 超商 Action: 引進數位服務
    toggleVirtualService(corpId, service) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;

        const state = corp.retailState;
        if (state.virtualServices.includes(service)) {
            state.virtualServices = state.virtualServices.filter(x => x !== service);
            app.log(`【服務暫停】${corp.name} 已取消引進 [${service === 'game_cards' ? '數位遊戲卡點數' : '演唱會與賽事門票'}] 代收代理。`, "text-yellow");
        } else {
            state.virtualServices.push(service);
            app.log(`【代理代收引進】${corp.name} 順利引進 [${service === 'game_cards' ? '數位遊戲卡點數' : '演唱會與賽事門票'}]！零庫存零風險，躺著收取高頻手續費手續金。`, "text-green-400 font-bold");
        }
        this.refreshRetailTabUI(corp);
    },

    // 量販店 Action: 調整加價率
    changeMarkupRate(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;
        corp.retailState.markupRate = parseInt(value);
        app.log(`【量販定價策略】${corp.name} 將商品加價率調整為: ${value}%。毛利率越低性價比越高，對會員辦卡的吸引力越強！`, "text-yellow");
        this.refreshRetailTabUI(corp);
    },

    // 量販店 Action: 調整會員費
    changeMemberFee(corpId, tier, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;
        if (tier === 'normal') {
            corp.retailState.memberFeeNormal = parseInt(value);
        } else {
            corp.retailState.memberFeeDiamond = parseInt(value);
        }
        app.log(`【量販會員費設定】${corp.name} 將 [${tier === 'normal' ? '一般卡' : '黑鑽高級卡'}] 的會員年費金額設定為: $${value}。年費過高將影響辦卡成長率！`, "text-yellow");
        this.refreshRetailTabUI(corp);
    },

    // 量販店 Action: 啟動尋寶採購特賣
    startTreasureHunt(corpId, item) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;

        const state = corp.retailState;
        if (state.treasureHuntDaysLeft > 0) {
            app.log("【特賣進行中】目前正有一檔特賣案在手，請等待該特賣消化結束！", "text-red-500");
            return;
        }

        let cost = item === 'fast_charger' ? 3000000 : 8000000;
        let finalCost = cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            state.treasureHuntItem = item;
            state.treasureHuntDaysLeft = 30; // 特賣 30 天
            app.log(`【大賣場尋寶特賣】🔥 ${corp.name} 成功出資 $${app.formatMoney(finalCost)} 從特殊管道低價買斷引進一批 [${item === 'fast_charger' ? '高瓦數快充頭' : '11吋大屏幕平板'}]，開啟為期 30 天的黃金破盤特賣！引爆大量排隊 Foot Traffic！`, "text-yellow font-bold animate-pulse");
            this.refreshRetailTabUI(corp);
        } else {
            app.log(`【資金不足】開啟特賣採購案需要 $${app.formatMoney(finalCost)} 現金！`, "text-red-500");
        }
    },

    // 機能服飾 Action: 發售 Drop
    scheduleDrop(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;

        const state = corp.retailState;
        let cost = type === 'hype_raffle' ? 5000000 : 15000000;
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;

            if (type === 'hype_raffle') {
                state.hypeLevel = Math.min(100, state.hypeLevel + 30);
                state.brandReputation = Math.min(100, state.brandReputation + 5);
                state.bagInventory += 500; // 特殊限量球鞋 500 件
                app.log(`【限量抽籤發售】👟 ${corp.name} 斥資 $${app.formatMoney(finalCost)} 安排年度限量重磅球鞋「Raffle 抽籤發售檔期」，全省潮流愛好者為之瘋狂！成功引爆市場熱度 Hype +30！`, "text-yellow font-bold animate-pulse");
            } else {
                // 常規鋪貨
                state.inventoryVolume += 50000; // 注入 5 萬件庫存
                state.hypeLevel = Math.max(10, state.hypeLevel - 15); // 稀釋熱度
                app.log(`【大宗服飾鋪貨】👕 ${corp.name} 斥資 $${app.formatMoney(finalCost)} 進行全渠道大批量常規冬秋機能服飾大量鋪貨！注入 50,000 件商品庫存，雖然短期將大量銷貨換現，但引致潮流稀缺熱度下降。`, "text-green-400 font-bold");
            }
            this.refreshRetailTabUI(corp);
        } else {
            app.log(`【資金不足】安排 Drop 發售檔期需要 $${app.formatMoney(finalCost)} 現金！`, "text-red-500");
        }
    },

    // 機能服飾 Action: 出清庫存
    clearInventory(corpId, strategy) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;

        const state = corp.retailState;
        if (state.inventoryVolume <= 0) {
            app.log("【無庫存】目前倉庫空空如也，無任何滯銷庫存需要出清！", "text-red-500");
            return;
        }

        if (strategy === 'outlet') {
            // Outlet 折扣出清
            let cashRec = Math.floor(state.inventoryVolume * 1200); // 一件回收 1200 元工本費
            corp.corporateCash += cashRec;
            corp.monthRevenue = (corp.monthRevenue || 0) + cashRec;
            state.hypeLevel = Math.max(10, state.hypeLevel - 15);
            state.brandReputation = Math.max(10, state.brandReputation - 5);
            app.log(`【庫存傾銷 Outlet】🏬 ${corp.name} 將 ${state.inventoryVolume.toLocaleString()} 件過季滯銷機能衣強行打包傾倒至 Outlet 通路打兩折狂甩！成功換回急用救命現金 $${app.formatMoney(cashRec)}，但品牌潮流熱度與聲譽因此滑落。`, "text-yellow font-bold");
            state.inventoryVolume = 0;
        } else if (strategy === 'burn') {
            // 直接焚毀，維持形象
            if (!confirm("【警告：焚毀清庫存將認列全額工料損失】\n您確定要將所有過季機能衣送往焚化爐銷毀，以維持品牌極高傲的潮流神格化形象嗎？\n此舉將沒有任何現金回流。")) {
                return;
            }
            state.brandReputation = Math.min(100, state.brandReputation + 8);
            state.hypeLevel = Math.min(100, state.hypeLevel + 5);
            app.log(`【焚燒銷毀滯銷】🔥 ${corp.name} 堅持頂級機能潮牌的高傲風骨，正式將倉庫中所有 ${state.inventoryVolume.toLocaleString()} 件滯銷機能服直接送往焚化爐付之一炬！向消費者宣示絕不打折，品牌聲譽與高端 Hype 熱度成功提升！`, "text-red-500 font-bold animate-pulse");
            state.inventoryVolume = 0;
        }
        state.inventoryAge = 0;
        this.refreshRetailTabUI(corp);
    },

    // 專門店 Action: 調整自有品牌比例
    changePrivateLabelRatio(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;
        corp.retailState.privateLabelRatio = parseInt(value);
        app.log(`【專門店產品陳列】${corp.name} 自有品牌商品在架陳列比例設定為: ${value}%。陳列比重越高，綜合商品毛利率空間越大，但高度考驗品牌知名度！`, "text-yellow");
        this.refreshRetailTabUI(corp);
    },

    // 專門店 Action: 調整推銷研發費
    changeMarketingExpense(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;
        corp.retailState.marketingExpense = parseInt(value);
        app.log(`【推廣預算設定】${corp.name} 自有美妝/五金品牌每日行銷推廣費調整為: $${app.formatMoney(value)}/日。`, "text-yellow");
        this.refreshRetailTabUI(corp);
    },

    // 專門店 Action: 擴展 SKU 品項
    expandSKU(corpId, count) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;

        let cost = 10000000;
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            corp.retailState.skuCount += count;
            let subMsg = isFirstYearSubsidized ? ` (享內需法案 SKU 擴展政策性 20% 資金大額減免)` : '';
            app.log(`【專門店產品品項擴增】${corp.name} 斥資 $${app.formatMoney(finalCost)}${subMsg} 解鎖引入了 ${count.toLocaleString()} 種全新 SKU 商品！吸引大量居家與美妝目的性客群。`, "text-green-400 font-bold");
            this.refreshRetailTabUI(corp);
        } else {
            app.log(`【資金不足】解鎖商品 SKU 多樣性需要 $${app.formatMoney(finalCost)} 現金儲備！`, "text-red-500");
        }
    },

    // 百貨公司 Action: 切換樓層櫃位
    changeFloorTenant(corpId, floor, tenantType) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;
        
        corp.retailState.floors[floor] = tenantType;
        const tenantNamesShort = {
            'luxury_boutique': '👜 名牌精品專櫃',
            'dining': '🍔 連鎖人氣餐飲',
            'entertainment': '🎬 影城娛樂中心',
            'fashion': '👗 精品時尚服飾',
            'home_appliance': '📺 居家家電大廠'
        };
        app.log(`【招商佈局調整】${corp.name} 將 [${floor.toUpperCase()}] 樓層重新招商，成功更換為 [${tenantNamesShort[tenantType]}]！`, "text-cyan");
        this.refreshRetailTabUI(corp);
    },

    // 百貨公司 Action: 調整週年慶預算
    changeAnniversaryBudget(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;
        
        corp.retailState.anniversaryPromoBudget = parseInt(value);
        app.log(`【週年慶大促設定】${corp.name} 週年慶「滿千送百」行銷每日補貼預算設定為: $${app.formatMoney(value)}/日。金額越高，週年慶爆發力越強！`, "text-yellow");
        this.refreshRetailTabUI(corp);
    },

    // 精品 Action: 調整配貨比
    changeQuotaRatio(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;
        
        corp.retailState.quotaRatio = parseInt(value);
        app.log(`【精品配貨比例調整】${corp.name} 將限量手工包袋購買的「隱性配貨比」設定為: ${value}%。這是一把雙刃劍，高度考驗品牌神話聲譽！`, "text-yellow");
        this.refreshRetailTabUI(corp);
    },

    // 精品 Action: 升級工匠學院
    upgradeAcademy(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;

        const state = corp.retailState;
        if (state.academyUpgraded) return;

        let cost = 80000000;
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            state.academyUpgraded = true;
            let subMsg = isFirstYearSubsidized ? ` (獲國家精品特殊工藝扶持法案 20% 資金大額減免)` : '';
            app.log(`【手工工匠學院擴建】🎓 ${corp.name} 斥資 $${app.formatMoney(finalCost)}${subMsg} 成功在義大利與法國邊緣建立高端工匠大師培訓學院！精品神話防禦力永久 +10 點！`, "text-yellow-500 font-bold animate-pulse");
            this.refreshRetailTabUI(corp);
        } else {
            app.log(`【資金不足】擴建高端手工工匠學院需要 $${app.formatMoney(finalCost)} 現金儲備！`, "text-red-500");
        }
    },

    // 精品 Action: 招募工匠
    recruitArtisans(corpId, count) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;

        const state = corp.retailState;
        let cost = 15000000;
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            state.artisanCount += count;
            let subMsg = isFirstYearSubsidized ? ` (獲工藝擴充補貼 20% 大額資金減免)` : '';
            app.log(`【招募培訓手工匠人】🧵 ${corp.name} 成功撥款 $${app.formatMoney(finalCost)}${subMsg} 招募培訓了 ${count} 名頂尖手工皮件工匠大師！每日限量精品包生產上限提升。`, "text-green-400 font-bold");
            this.refreshRetailTabUI(corp);
        } else {
            app.log(`【資金不足】招聘手工大師老工匠需要 $${app.formatMoney(finalCost)} 現金！`, "text-red-500");
        }
    },

    // 精品 Action: 切換外包量產
    toggleOutsource(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.retailState) return;

        const state = corp.retailState;
        if (state.outsourced) {
            state.outsourced = false;
            app.log(`【回歸工藝風骨】🧵 ${corp.name} 終止了流水線工業化量產外包！全數限量包包回歸由歐洲手工匠人一針一線親手縫製。品牌神話聲譽重塑開始！`, "text-green-400 font-bold animate-pulse");
        } else {
            if (!confirm("【致命靈魂契約：啟動流水線量產將徹底摧毀品牌神格聲譽】\n您確定要將高端皮包外包給工業流水線生產嗎？\n\n這會使高端限量包的每日產能瞬間暴增 10 倍、日營收成倍噴飛；但代價是，品牌聲譽每日重挫 -0.8%！\n一旦聲譽低於 60 點，所有商品定價將腰斬跌落 50%！")) {
                return;
            }
            state.outsourced = true;
            app.log(`【💀 啟動流水線量產外包】${corp.name} 屈服於百億淨利潤的誘惑，正式對外簽訂大型工業流水線外包量產合約！產能瓶頸完全打通，但品牌神話將遭受每日重挫！`, "text-red-500 font-bold animate-pulse");
        }
        this.refreshRetailTabUI(corp);
    },

    // 輔助更新 UI
    refreshRetailTabUI(corp) {
        const contentArea = document.getElementById('ceo-detail-tab-content');
        if (contentArea) {
            const isReadOnly = corp.isPlayerFounded ? false : (corp.playerRole ? false : true);
            this.renderRetailTab(corp, contentArea, isReadOnly);
        }
        
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl && typeof app !== 'undefined') {
            cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        }

        if (typeof app !== 'undefined' && app.updateUI) {
            app.updateUI();
        }
    },

    // ==========================================
    // 4. 每日營收結算 (Process Revenue)
    // ==========================================
    processRevenue(corp) {
        if (!corp.retailState) this.initAssets(corp);
        
        const state = corp.retailState;
        let daysOldForSub = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOldForSub <= 90) || (corp.isListed && ipoDaysOld <= 90);
        
        let dailyRev = 0;
        let dailyExp = 0;
        
        let rti = app.state.RTI || 100; // 百貨大眾消費指數
        let pMult = app.state.priceMultiplier || 1.0; // 通貨膨脹物價乘數

        // ------------------------------------------
        // A. 連鎖超商與小超市 (cvs_minimart)
        // ------------------------------------------
        if (corp.bizModel === 'cvs_minimart') {
            // 基礎日常門市營運折舊支出
            dailyExp += state.storeCount * 250;
            // 冷鏈物流中心維持費
            const coldChainMaints = { 1: 2000, 2: 8000, 3: 25000 };
            dailyExp += coldChainMaints[state.coldChainLevel] || 2000;

            // 門市日客流量 (受門市總數與消費 RTI 熱度支配)
            let traffic = state.storeCount * (120 + Math.random() * 30) * (rti / 100);
            
            // 原物料通膨長鞭效應 (若通膨高，材料成本增加，除非調高售價但會流失客流量)
            // 假設：若 pMult > 1.2，超商會承受食品通膨，除非玩家流失客流量。這裡自動計算平衡：
            let inflationFactor = pMult > 1.25 ? (pMult - 1.25) : 0;
            let costMarkupMod = 1 + inflationFactor * 0.4; // 成本上升高達 40%

            // 1. 鮮食商品結算
            let bentoPrice = 100 * pMult;
            let bentoSalesQty = 0;
            let bentoMarkup = 0.35; // 基礎毛利率 35%
            let bentoBaseScrap = 0.10; // 基礎報廢率 10%

            if (state.shelfProduct === 'collab_chicken') {
                bentoPrice = 150 * pMult;
                bentoSalesQty = traffic * 0.15;
                bentoMarkup = 0.45;
                bentoBaseScrap = 0.25;
            } else if (state.shelfProduct === 'collab_pizza') {
                bentoPrice = 180 * pMult;
                bentoSalesQty = traffic * 0.12;
                bentoMarkup = 0.40;
                bentoBaseScrap = 0.20;
            } else {
                bentoSalesQty = traffic * 0.20;
            }

            // 冷鏈物流等級減免鮮食報廢率
            let scrapReduction = { 1: 0.10, 2: 0, 3: -0.08 };
            let finalScrapRate = Math.max(0.01, bentoBaseScrap + (scrapReduction[state.coldChainLevel] || 0));

            // 通膨帶來的利潤稀釋 (未反映在價格上則毛利率縮水)
            let currentBentoMarkup = Math.max(0.05, bentoMarkup - inflationFactor * 0.15); 
            
            let bentoProdCost = bentoSalesQty * bentoPrice * (1 - currentBentoMarkup) * costMarkupMod;
            let actualBentoSold = bentoSalesQty * (1 - finalScrapRate);
            let bentoRevenue = actualBentoSold * bentoPrice;

            dailyRev += bentoRevenue;
            dailyExp += bentoProdCost;

            // 2. 數位虛擬代收手續費收益 (100% 淨利，無本萬利)
            if (state.virtualServices.includes('game_cards')) {
                // 客流的 50% 購買率，每筆代收提取 $5 手續費
                dailyRev += (traffic * 0.05) * 5;
            }
            if (state.virtualServices.includes('concert_tickets')) {
                // 客流的 1% 購買率，每筆代收提取 $20 手續費
                dailyRev += (traffic * 0.01) * 20;
            }

            // 雙軌政策保護：自創或上市初期超商公司店面維持折舊打五折
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += state.storeCount * 80; // 國家特許內需撥款補貼
            }
        }
        
        // ------------------------------------------
        // B. 倉儲量販與大賣場 (hypermarket)
        // ------------------------------------------
        else if (corp.bizModel === 'hypermarket') {
            const p = corp.price || corp.basePrice || 100;
            const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;
            
            // 基礎店面折舊與物流 CAPEX
            dailyExp += 30000 * scale;

            // 1. 會員卡流動計算 (加價率 markupRate 越低，性價比越高，辦卡率越高)
            let priceCompetitiveness = (20 - state.markupRate) / 10; // 5%~20% 之間。值約在 0 ~ 1.5
            let normalFeeFactor = (2500 - state.memberFeeNormal) / 1000;
            let diamondFeeFactor = (5000 - state.memberFeeDiamond) / 2000;
            let competitivenessIndex = priceCompetitiveness * (normalFeeFactor + diamondFeeFactor);

            // 每天會員辦卡增減
            let memberChange = Math.floor((competitivenessIndex * 50 - 15) * scale * (rti / 100));
            state.memberCount = Math.max(200, state.memberCount + memberChange);

            // 2. 每日被動會員費分成營收
            let dailyNormalFeeRev = (state.memberCount * (1 - state.diamondRatio) * state.memberFeeNormal) / 365;
            let dailyDiamondFeeRev = (state.memberCount * state.diamondRatio * state.memberFeeDiamond) / 365;
            dailyRev += dailyNormalFeeRev + dailyDiamondFeeRev;

            // 3. 商品銷售與利潤計算
            let dailyTraffic = state.memberCount * (0.05 + Math.random() * 0.02);
            if (state.treasureHuntDaysLeft > 0) {
                dailyTraffic *= 1.50; // 特賣帶來 1.5 倍客流
                state.treasureHuntDaysLeft--;
            }
            
            let spendPerPerson = 1500 * pMult; // 平均每人消費 $1500
            let totalSales = dailyTraffic * spendPerPerson;
            // 利潤為 totalSales * 加價率/100
            let salesRev = totalSales;
            let salesCost = totalSales * (1 - (state.markupRate / 100));

            dailyRev += salesRev;
            dailyExp += salesCost;

            // 雙軌政策保護
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += 50000; // 國家大額振興支持補貼
            }
        }
        
        // ------------------------------------------
        // C. 運動休閒與機能服飾 (sports_apparel)
        // ------------------------------------------
        else if (corp.bizModel === 'sports_apparel') {
            const p = corp.price || corp.basePrice || 100;
            const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;
            
            // 基礎行政推廣費
            dailyExp += 10000 * scale;
            
            // 潮流熱度與聲譽的每日自然衰退
            state.hypeLevel = Math.max(10, state.hypeLevel - 0.15);
            state.brandReputation = Math.max(20, state.brandReputation - 0.05);

            // 每 90 天換季，若有庫存則產生積壓倉儲租金 (每件每日 $5 倉儲費)
            state.inventoryAge++;
            dailyExp += state.inventoryVolume * 5;

            // 每日銷售結算 (受 Hype 熱度與消費 RTI 熱度直接加成)
            let dailyQty = Math.floor(state.inventoryVolume * 0.03 * (state.hypeLevel / 100) * (rti / 100));
            dailyQty = Math.min(state.inventoryVolume, dailyQty);

            if (dailyQty > 0) {
                let unitPrice = 3000 * pMult * (1 + (state.hypeLevel / 100) * 0.5); // 熱度溢價
                let unitCost = 800; // 工料成本
                
                let rev = dailyQty * unitPrice;
                let cost = dailyQty * unitCost;

                dailyRev += rev;
                dailyExp += cost;
                state.inventoryVolume -= dailyQty;
            }

            // 每日 1% 機率自動再生產一小批新服飾補庫存
            if (Math.random() < 0.015 && state.inventoryVolume < 20000 * scale) {
                let newBatch = 20000 * scale;
                let batchCost = newBatch * 700; // 大量生產更便宜
                if (corp.corporateCash >= batchCost) {
                    corp.corporateCash -= batchCost;
                    corp.monthExpense = (corp.monthExpense || 0) + batchCost;
                    state.inventoryVolume += newBatch;
                    app.log(`【供應鏈通知】機能服飾廠 ${corp.name} 順利交付一期全新秋冬機能衣庫存 ${newBatch.toLocaleString()} 件！支出工料費 -$${app.formatMoney(batchCost)}。`, "text-cyan");
                }
            }

            // 雙軌政策保護
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += 30000;
            }
        }
        
        // ------------------------------------------
        // D. 居家與美妝專門店 (specialty_home)
        // ------------------------------------------
        else if (corp.bizModel === 'specialty_home') {
            // 門市日常折舊與水電
            dailyExp += state.skuCount * 5;
            dailyExp += state.marketingExpense; // 行銷預算扣減

            // 自有品牌知名度更新
            if (state.marketingExpense >= 20000) {
                state.brandReputationSpecialty = Math.min(100, state.brandReputationSpecialty + 0.15);
            } else if (state.marketingExpense < 4000) {
                state.brandReputationSpecialty = Math.max(10, state.brandReputationSpecialty - 0.08);
            }

            // 每日總客流量 (受 SKU 數量與 RTI 控制)
            let traffic = state.skuCount * 0.8 * (rti / 100);

            // 1. 代理大廠品牌 (低毛利 20%)
            let agencyRatio = (100 - state.privateLabelRatio) / 100;
            let agencySales = traffic * agencyRatio * 250 * pMult;
            let agencyProfit = agencySales * 0.20;

            dailyRev += agencySales;
            dailyExp += agencySales * 0.80; // 材料與代理費

            // 2. 自有品牌 (高毛利 60% | 受自有聲譽高度拉動轉換率)
            let privateLabelRatioDec = state.privateLabelRatio / 100;
            let privatePurchaseChance = state.brandReputationSpecialty / 100; // 聲譽越好，購買機率越高
            let privateSales = traffic * privateLabelRatioDec * privatePurchaseChance * 350 * pMult;
            
            dailyRev += privateSales;
            dailyExp += privateSales * 0.40; // 自有品牌工料成本 40%

            // 雙軌政策保護
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += 25000;
            }
        }
        
        // ------------------------------------------
        // E. 綜合百貨與購物中心 (department_store)
        // ------------------------------------------
        else if (corp.bizModel === 'department_store') {
            const p = corp.price || corp.basePrice || 100;
            const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;
            
            // 百貨大樓維修與水電日常折舊
            dailyExp += 40000 * scale;

            // 連鎖餐飲(dining)專櫃的引流加成
            let diningCount = 0;
            Object.values(state.floors).forEach(v => { if (v === 'dining') diningCount++; });
            let flowHype = 1.0 + diningCount * 0.25; // 每個餐飲提振 25% 人流

            // 計算百貨大樓基礎人流量
            let baseTraffic = 1200 * scale * (rti / 100) * flowHype;

            // 週年慶檔期判定 (如果是在 10, 11, 12 月，或者手動週年慶剩餘天數 > 0)
            let isAnniversaryActive = false;
            let currentMonth = app.state.date.getMonth() + 1;
            if (currentMonth === 10 || currentMonth === 11 || currentMonth === 12 || state.anniversaryDaysLeft > 0) {
                isAnniversaryActive = true;
            }

            let promoHype = 1.0;
            if (state.anniversaryPromoBudget > 0 && isAnniversaryActive) {
                dailyExp += state.anniversaryPromoBudget; // 促銷預算支出
                promoHype = 1.0 + (state.anniversaryPromoBudget / 40000); // 補貼力度放大
            }

            if (state.anniversaryDaysLeft > 0) {
                state.anniversaryDaysLeft--;
            }

            let finalTraffic = baseTraffic;
            if (isAnniversaryActive) {
                finalTraffic *= 3.5 * promoHype; // 週年慶大爆發
            }

            // 櫃位租金與抽成分成計算
            Object.entries(state.floors).forEach(([flKey, flVal]) => {
                // 固定店鋪日租金
                let baseRent = 15000 * scale;

                if (flVal === 'luxury_boutique') {
                    // 精品專櫃對客流有嚴格門檻要求，若人氣過低會招不到商/空置
                    if (finalTraffic < 500) {
                        state.vacancyRate = Math.min(0.50, state.vacancyRate + 0.02); // 空置率增加
                    } else {
                        state.vacancyRate = Math.max(0.01, state.vacancyRate - 0.01);
                        
                        // 精品抽成：客流的 8% 購買率，每單均價 $20,000，百貨公司抽成 18%
                        let luxurySales = finalTraffic * 0.08 * 20000 * pMult;
                        let luxuryCommission = luxurySales * 0.18;
                        dailyRev += luxuryCommission + baseRent * (1 - state.vacancyRate);
                    }
                } else if (flVal === 'dining') {
                    // 餐飲抽成低，但人潮帶來流量：抽成 5%，每單均價 $400
                    let diningSales = finalTraffic * 0.40 * 400 * pMult;
                    dailyRev += diningSales * 0.05 + baseRent;
                } else if (flVal === 'entertainment') {
                    // 影城抽成 8%
                    let entSales = finalTraffic * 0.25 * 300 * pMult;
                    dailyRev += entSales * 0.08 + baseRent * 1.2; // 固定高租金
                } else if (flVal === 'fashion') {
                    // 時尚服飾抽成 12%，客單價 $3,000
                    let fashionSales = finalTraffic * 0.20 * 3000 * pMult;
                    dailyRev += fashionSales * 0.12 + baseRent;
                } else if (flVal === 'home_appliance') {
                    // 家電抽成 10%，均價 $10,000
                    let appSales = finalTraffic * 0.05 * 10000 * pMult;
                    dailyRev += appSales * 0.10 + baseRent;
                }
            });

            // 雙軌政策保護
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += 40000;
            }
        }
        
        // ------------------------------------------
        // F. 頂級奢華與時尚精品 (luxury_brand)
        // ------------------------------------------
        else if (corp.bizModel === 'luxury_brand') {
            const p = corp.price || corp.basePrice || 100;
            const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;
            
            // 手工匠人工資與奢華沙龍折舊
            let artisanWage = state.artisanCount * 2500;
            dailyExp += artisanWage + 20000 * scale;

            // 工藝與工匠學院聲譽加成
            let academyRepBonus = state.academyUpgraded ? 10 : 0;
            
            // 每日品牌神話名聲自然波動
            if (state.quotaRatio > 150) {
                // 配貨比太重引起社會輿論反彈
                state.brandReputationLuxury = Math.max(10, state.brandReputationLuxury - 0.12);
            }
            
            // 處理致命流水線外包量產
            let capLimit = state.artisanCount * 0.2; // 手工產能：每人每日 0.2 個包包
            if (state.outsourced) {
                capLimit *= 10; // 產能暴增 10 倍！
                state.brandReputationLuxury = Math.max(5, state.brandReputationLuxury - 0.8); // 聲譽暴跌！
            } else {
                // 停止外包後，聲譽每日極慢爬升重塑
                state.brandReputationLuxury = Math.min(100, state.brandReputationLuxury + 0.03 + (state.academyUpgraded ? 0.02 : 0));
            }

            // 匠人縫製皮包，補充在庫包包庫存
            let craftQty = state.outsourced ? (state.artisanCount * 2) : (state.artisanCount * 0.2);
            state.bagInventory += craftQty;

            // 溢價破滅判定 (神話聲譽跌破 60，包包定價永久腰斬，顧客反感度上升)
            let baseBagPrice = 300000 * pMult;
            if (state.brandReputationLuxury < 60) {
                baseBagPrice *= 0.50; // 流水線氾濫、品牌神話破滅
            }

            // 每日高端限量包袋需求 (受神話與 RTI 支配)
            let demand = (state.brandReputationLuxury / 100) * 15 * scale * (rti / 100) * (1 + academyRepBonus / 100);
            
            // 配貨比對客流的影響
            if (state.quotaRatio > 100) {
                let reputationDemandPenalty = Math.max(0.2, (100 - state.brandReputationLuxury) / 100); // 聲譽越低，懲罰越重
                let quotaEx = (state.quotaRatio - 100) / 100;
                demand *= Math.max(0.1, 1 - quotaEx * reputationDemandPenalty * 0.8); // 配貨比過高造成需求量大扣減
            }

            let actualSold = Math.min(demand, state.bagInventory);
            
            if (actualSold > 0) {
                // 1. 包包銷售主營收
                let bagRev = actualSold * baseBagPrice;
                let bagCost = actualSold * 20000; // 每包材料與手工工料 2 萬

                dailyRev += bagRev;
                dailyExp += bagCost;
                state.bagInventory = Math.max(0, state.bagInventory - actualSold);

                // 2. 隱性加購配貨銷售營收 (配貨商品平均毛利為 50%，如絲巾、鞋款)
                let quotaVal = bagRev * (state.quotaRatio / 100);
                dailyRev += quotaVal;
                dailyExp += quotaVal * 0.50; // 工料成本 50%
            }

            // 雙軌政策保護
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += 35000;
            }
        }

        // 全域 NaN 安全限幅與防禦過濾 (極致防護)
        if (isNaN(dailyRev) || dailyRev === undefined || dailyRev < 0) dailyRev = 0;
        if (isNaN(dailyExp) || dailyExp === undefined || dailyExp < 0) dailyExp = 0;

        // 全域現金更新與月報表計入
        corp.corporateCash = Number(corp.corporateCash || 0) + dailyRev - dailyExp;
        if (isNaN(corp.corporateCash) || corp.corporateCash < 0) corp.corporateCash = 0;
        corp.monthRevenue = Number(corp.monthRevenue || 0) + dailyRev;
        corp.monthExpense = Number(corp.monthExpense || 0) + dailyExp;
        corp.lastDailyRev = dailyRev;
        corp.lastDailyExp = dailyExp;
    }
};

window.CEO_RETAIL = CEO_RETAIL;
