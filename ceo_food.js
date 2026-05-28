// ceo_food.js - 食品與農業產業（四大商業模型）核心模擬子系統
// 僅使用台灣繁體中文，嚴格防範 NaN 異常

const CEO_FOOD = {
    // ==========================================
    // 1. 初始化資產 (Init Assets)
    // ==========================================
    initAssets(corp) {
        if (!corp.foodState) {
            corp.foodState = {
                // 通用食品狀態
                bciDailyEffect: 1.0,
                
                // 1. 大宗農牧與原物料 (agri_commodity)
                hedgingRatio: 30,           // 期貨避險鎖價比 (0% ~ 100%)
                lockedPrice: 100,           // 期貨合約鎖定價格
                stockpile: 0,               // 穀物現貨戰備囤積庫存天數
                biosecurityLevel: 1,        // 生物防疫等級 (1~3)
                droughtDaysLeft: 0,         // 大旱乾旱事件賸餘天數
                pigFluDaysLeft: 0,          // 豬瘟/禽流感停工整改賸餘天數
                capacity: 1000,             // 每日原物料最大生產噸數
                
                // 2. 包裝食品與飲料 (fmcg_beverage)
                healthRatio: 20,            // 健康與低糖產品佔比 (0% ~ 100%)
                healthReputation: 30,       // 品牌健康聲譽 (0~100)
                healthRndExpense: 5000,     // 每日健康研發與推廣預算
                slottingFee: 5,             // 超商大賣場黃金上架提成比 (0% ~ 15%)
                
                // 3. 商用原物料與烘焙 (b2b_ingredients)
                contractDiscount: 10,       // 招商長約讓利折扣率 (0% ~ 30%)
                activeContracts: [],        // 承包中的 B2B 下游供應長約: { id, clientName, dailyRev, dailyCost, daysLeft }
                blockchainSafe: false,      // 是否建立區塊鏈產銷履歷系統
                foodSafetyRiskDays: 0,      // 食安風暴處罰與客戶全面解約的賸餘天數
                
                // 4. 全球連鎖快餐與餐飲 (qsr_dining)
                menuMarkup: 0,              // 菜單售價調整比例 (-20% 至 +50%)
                autoLevel: 1,               // 廚房與烹飪自動化等級 (1~3)
                kioskEnabled: false,        // 是否引入自助點餐機與專屬外送 App
                storeCount: 1,              // 連鎖門市數量
                baseTraffic: 1500           // 每家門市基礎客流人次
            };
        }

        const state = corp.foodState;
        const p = corp.price || corp.basePrice || 100;
        const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;

        // 玩家創立之公司為新創空殼公司，不給予上市公司級初始資源 (依據 user_rules)
        if (corp.isPlayerFounded) {
            if (corp.bizModel === 'agri_commodity') {
                state.capacity = 100;
            } else if (corp.bizModel === 'qsr_dining') {
                state.storeCount = 1;
            }
            return;
        }

        // ==========================================
        // 非玩家（上市公司）根據規模給予初始資源與設定
        // ==========================================
        
        // A. 大宗農牧與原物料 (agri_commodity)
        if (corp.bizModel === 'agri_commodity') {
            state.capacity = 1000 + scale * 50;
            state.biosecurityLevel = 2; // 上市大廠預設優良防疫
            if (['1215', '1210'].includes(corp.id)) { // 卜蜂、大成
                state.biosecurityLevel = 3; // 頂規負壓大廠
                state.hedgingRatio = 50;
            }
        }
        
        // B. 包裝食品與飲料 (fmcg_beverage)
        else if (corp.bizModel === 'fmcg_beverage') {
            if (corp.id === '1216') { // 統一
                state.healthReputation = 75;
                state.healthRatio = 35;
                state.slottingFee = 10;
            } else if (corp.id === 'KO') { // 可口可樂
                state.healthReputation = 85;
                state.healthRatio = 40; // 零卡可樂大熱銷
                state.slottingFee = 12;
            } else if (corp.id === 'PEP') { // 百事
                state.healthReputation = 70;
                state.healthRatio = 30;
                state.slottingFee = 10;
            } else {
                state.healthReputation = 50;
                state.healthRatio = 15;
                state.slottingFee = 6;
            }
        }
        
        // C. 商用原物料與烘焙 (b2b_ingredients)
        else if (corp.bizModel === 'b2b_ingredients') {
            state.blockchainSafe = ['1702'].includes(corp.id); // 南僑預設導入產銷履歷
            // 初始分配 2 個穩健合約
            state.activeContracts.push(
                { id: 'C-1', clientName: '麥當勞', dailyRev: scale * 180000, dailyCost: scale * 45000, daysLeft: 70 },
                { id: 'C-2', clientName: '連鎖烘焙大廠', dailyRev: scale * 100000, dailyCost: scale * 25000, daysLeft: 40 }
            );
        }
        
        // D. 全球連鎖快餐與餐飲 (qsr_dining)
        else if (corp.bizModel === 'qsr_dining') {
            state.autoLevel = 2;
            state.kioskEnabled = ['MCD', 'SBUX'].includes(corp.id); // 麥當勞、星巴克預設數位點餐
            
            if (corp.id === 'MCD') { // 麥當勞
                state.storeCount = 350 + scale * 20;
                state.autoLevel = 3;
            } else if (corp.id === 'SBUX') { // 星巴克
                state.storeCount = 500 + scale * 30;
            } else {
                state.storeCount = 50 + scale * 5;
            }
        }
    },

    // ==========================================
    // 2. UI 渲染派發 (Render)
    // ==========================================
    renderFoodTab(corp, contentArea, isReadOnly) {
        if (!corp.foodState) this.initAssets(corp);
        let html = `<div class="p-4 bg-black border border-gray-800 rounded crt">`;
        
        // 初始化全域大宗穀物期貨指數 (避險沙盒機制)
        if (typeof app !== 'undefined' && app.state && !app.state.agriIndex) {
            app.state.agriIndex = 100.0;
        }
        let agriPrice = (app.state && app.state.agriIndex) ? app.state.agriIndex : 100.0;
        let priceColor = agriPrice >= 130 ? 'text-red-400 font-bold animate-pulse' : (agriPrice <= 80 ? 'text-green-400 font-bold' : 'text-yellow');
        
        // 頂部全域大宗物資指數橫幅
        html += `<div class="mb-4 text-xs text-gray-300 bg-gray-900 bg-opacity-80 p-3 rounded border border-gray-800 flex justify-between items-center shadow-[inset_0_0_10px_rgba(255,165,0,0.05)]">
            <div>🌾 國際大宗穀物 (黃小玉) 期貨物價指數: <span class="${priceColor}">${agriPrice.toFixed(1)} / 100</span></div>
            <div class="text-xs text-gray-400">※ 影響養殖飼料、麵粉烘焙油脂等上游成本，向下游逐步傳導！</div>
        </div>`;

        // 國家農業安定扶持與新創津貼法案（自創與上市初期護航）
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        if (isFirstYearSubsidized) {
            html += `<div class="mb-4 text-xs bg-green-950 bg-opacity-30 p-3 rounded border border-green-700 text-green-400 flex flex-col gap-1 shadow-[0_0_15px_rgba(0,255,0,0.1)] animate-pulse">
                <div class="font-bold flex items-center gap-1.5">🟢 國家農業發展與內需食品扶持特別條例 (前三個月資金護航)</div>
                <div class="text-xs text-gray-300">※ 享有：每日基礎折舊折舊維持與行政成本大額免除 50%。</div>
                <div class="text-xs text-gray-300">※ 享有：農畜立項避險或新產品研發 CAPEX 大額減免 20%。</div>
            </div>`;
        }

        // 根據 business model 進行 UI 分流
        if (corp.bizModel === 'agri_commodity') {
            html += this.renderAgriUI(corp, isReadOnly);
        } else if (corp.bizModel === 'fmcg_beverage') {
            html += this.renderFmcgUI(corp, isReadOnly);
        } else if (corp.bizModel === 'b2b_ingredients') {
            html += this.renderB2bUI(corp, isReadOnly);
        } else if (corp.bizModel === 'qsr_dining') {
            html += this.renderDiningUI(corp, isReadOnly);
        }
        
        html += `</div>`;
        contentArea.innerHTML = html;
    },

    // ==========================================
    // 2-A. 大宗農牧與原物料 (agri_commodity) UI
    // ==========================================
    renderAgriUI(corp, isReadOnly) {
        const state = corp.foodState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-yellow font-bold mb-2 text-md flex items-center gap-1">🌾 大宗農牧與原物料 (Agri & Commodity)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">大宗農牧是食品與餐飲的源頭，利潤高度波動。CEO 面臨國際「黃小玉」期貨價格大賭局：使用期貨進行採購鎖價、囤積囤貨，避開大旱引發的原料成本飆漲，並隨時升級水簾防疫以防禽流感暴擊！</p>`;

        // A. 基本資產狀態
        html += `<div class="grid grid-cols-3 gap-2.5 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">每日原牧生產噸數</div>
                <div class="text-yellow font-mono font-bold mt-0.5">${state.capacity.toLocaleString()} 噸</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">防疫生物防禦級別</div>
                <div class="text-green-400 font-bold mt-0.5">
                    ${state.biosecurityLevel === 3 ? '🥇 負壓無菌 (染疫率 0.05%)' : (state.biosecurityLevel === 2 ? '🥈 水簾密封 (染疫率 0.5%)' : '🥉 基礎開放 (染疫率 2%)')}
                </div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">戰備囤積現貨庫存</div>
                <div class="text-cyan font-mono font-bold mt-0.5">${state.stockpile} 天份</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 期貨避險鎖價
            let currentAgri = (app.state && app.state.agriIndex) ? app.state.agriIndex : 100.0;
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow pl-1.5">⚖️ 穀物期貨合約避險與鎖價設定 (Commodity Hedging)</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-yellow-800 border-opacity-40 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] space-y-4">
                <div>
                    <div class="flex justify-between text-xs text-gray-300 mb-1">
                        <span>🏷️ 穀物期貨採購合約鎖定比例：</span>
                        <span class="text-yellow font-bold" id="label-val-hedging">${state.hedgingRatio}% (合約鎖定)</span>
                    </div>
                    <div class="flex gap-4 items-center">
                        <input type="range" min="0" max="100" step="5" value="${state.hedgingRatio}" 
                               onchange="CEO_FOOD.changeHedgingRatio('${corp.id}', this.value)"
                               oninput="document.getElementById('label-val-hedging').innerText = this.value + '% (合約鎖定)'"
                               class="w-2/3 cursor-pointer accent-yellow-500">
                        <div class="text-[10px] text-gray-400 font-mono flex-1">
                            當前鎖定合約進貨價: <span class="text-yellow font-bold">$${state.lockedPrice.toFixed(0)}</span> / 噸
                        </div>
                    </div>
                    <span class="text-[10px] text-gray-500 block mt-2">※ 鎖定比率 100% 代表完全不受現貨現採國際期貨價格波動影響，若期貨飆漲您享有極低成本保護；但若期貨崩跌，您會被迫買高價。</span>
                </div>
                
                <div class="pt-3 border-t border-gray-900 flex justify-between items-center text-xs">
                    <div>
                        <div class="font-bold text-cyan">🌾 建立實體戰備現貨庫存 (現貨囤積)</div>
                        <p class="text-[10px] text-gray-400 mt-1">立刻以當前價格大額買斷 30 天穀物實物庫存！每日產生極微倉儲費。</p>
                    </div>
                    <button onclick="CEO_FOOD.buyStockpile('${corp.id}', 30)" class="btn-retro px-3 py-1.5 border-cyan text-cyan hover:bg-cyan-950 bg-opacity-20 font-bold transition">
                        採購 30 天戰備穀物 (-$${app.formatMoney(currentAgri * state.capacity * 6)})
                    </button>
                </div>
            </div>`;

            // C. 生物防疫與擴產
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow pl-1.5">🦠 豬瘟/禽流感生物安全防線 (Biosecurity Layer CapEx)</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            
            let bioUpgrade2Cost = isFirstYearSubsidized ? 24000000 : 30000000;
            let bioUpgrade3Cost = isFirstYearSubsidized ? 80000000 : 100000000;
            let capUpgradeCost = isFirstYearSubsidized ? 16000000 : 20000000;

            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">🦠 升級密封水簾負壓養殖廠</div>
                        <p class="text-[10px] text-gray-400 mt-1">升級至最高安全防疫防線，幾乎阻斷豬瘟或禽流感致命病毒！</p>
                    </div>
                    ${state.biosecurityLevel === 1 ? `
                        <button onclick="CEO_FOOD.upgradeBiosecurity('${corp.id}', 2)" class="btn-retro py-1.5 mt-3 text-xs border-green-500 text-green-400 font-bold transition">
                            升級至 Lv 2 水簾密封 (-$${app.formatMoney(bioUpgrade2Cost)})
                        </button>
                    ` : (state.biosecurityLevel === 2 ? `
                        <button onclick="CEO_FOOD.upgradeBiosecurity('${corp.id}', 3)" class="btn-retro py-1.5 mt-3 text-xs border-yellow-500 text-yellow font-bold transition animate-pulse">
                            升級至 Lv 3 負壓無菌 (-$${app.formatMoney(bioUpgrade3Cost)})
                        </button>
                    ` : `
                        <button disabled class="btn-retro py-1.5 mt-3 text-xs border-gray-800 text-gray-600 font-bold cursor-not-allowed">
                            已達最高 Lv 3 防疫級 (染疫率 0.05%)
                        </button>
                    `)}
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-yellow text-xs">🌾 擴建農場/飼料廠產能</div>
                        <p class="text-[10px] text-gray-400 mt-1">擴大養殖畜牧舍或大宗榨油/麵粉設備產線，使每日最大生產能力 +200 噸！</p>
                    </div>
                    <button onclick="CEO_FOOD.expandAgriCapacity('${corp.id}', 200)" class="btn-retro py-1.5 mt-3 text-xs border-yellow text-yellow font-bold transition">
                        擴建 +200 噸產能 (-$${app.formatMoney(capUpgradeCost)})
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-B. 包裝食品與飲料 (fmcg_beverage) UI
    // ==========================================
    renderFmcgUI(corp, isReadOnly) {
        const state = corp.foodState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-cyan font-bold mb-2 text-md">🥤 包裝食品與飲料 (FMCG & Beverage)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">包裝食品是典型的通路之爭。投入行銷研發，將傳統不健康含糖產品轉向低卡茶飲、植物肉與燕麥奶健康零食，可將毛利率大幅翻倍！給予連鎖超市上架通道費，則能使銷售量呈幾何倍數暴增！</p>`;

        // A. 狀態
        html += `<div class="grid grid-cols-3 gap-2.5 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">健康健康產品比重</div>
                <div class="text-cyan font-mono font-bold mt-0.5">${state.healthRatio}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">品牌健康聲譽</div>
                <div class="text-green-400 font-bold mt-0.5 animate-pulse">${state.healthReputation.toFixed(1)} / 100</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">超市黃金上架提成</div>
                <div class="text-yellow font-mono font-bold mt-0.5">${state.slottingFee}% 分成</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 健康拉桿與推廣費
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">🌱 自有品牌無糖與健康產品轉型 (Health Portfolio)</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-cyan-800 border-opacity-40 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] space-y-4">
                <div>
                    <div class="flex justify-between text-xs text-gray-300 mb-1">
                        <span>🌱 健康低糖系列產品陳列比重：</span>
                        <span class="text-green-400 font-bold" id="label-val-healthratio">${state.healthRatio}%</span>
                    </div>
                    <div class="flex gap-2 items-center">
                        <input type="range" min="0" max="100" step="5" value="${state.healthRatio}" 
                               onchange="CEO_FOOD.changeHealthRatio('${corp.id}', this.value)"
                               oninput="document.getElementById('label-val-healthratio').innerText = this.value + '%'"
                               class="w-full cursor-pointer accent-green-500">
                    </div>
                    <span class="text-[10px] text-gray-400">※ 傳統含糖食品毛利率僅 25% 且銷售衰退；低糖健康趨勢商品毛利率高達 55%！但高度考驗自家健康品牌聲譽。</span>
                </div>
                
                <div class="pt-3 border-t border-gray-900">
                    <div class="flex justify-between text-xs text-gray-300 mb-1">
                        <span>📢 每日健康研發與品牌廣告維持費：</span>
                        <span class="text-cyan font-bold" id="label-val-healthrnd">$${app.formatMoney(state.healthRndExpense)}/日</span>
                    </div>
                    <input type="range" min="1000" max="100000" step="2000" value="${state.healthRndExpense}" 
                           onchange="CEO_FOOD.changeHealthRnd('${corp.id}', this.value)"
                           oninput="document.getElementById('label-val-healthrnd').innerText = '$' + app.formatMoney(this.value) + '/日'"
                           class="w-full cursor-pointer accent-cyan-500">
                    <span class="text-[10px] text-gray-400">※ 每日投入行銷與研發費越高，品牌的健康聲譽將大幅攀升，吸引現代精緻健康客群，大幅拉抬銷路轉換！</span>
                </div>
            </div>`;

            // C. 上架通道費拉桿
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">🏬 連鎖超商/大賣場黃金貨架上架費 (Slotting Fee Bidding)</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="flex justify-between text-xs text-gray-300 mb-1">
                    <span>💵 給予零售大通路的銷售提成費比率：</span>
                    <span class="text-yellow-500 font-bold" id="label-val-slotting">${state.slottingFee}% (銷售分成)</span>
                </div>
                <div class="flex gap-4 items-center">
                    <input type="range" min="0" max="15" step="1" value="${state.slottingFee}" 
                           onchange="CEO_FOOD.changeSlottingFee('${corp.id}', this.value)"
                           oninput="document.getElementById('label-val-slotting').innerText = this.value + '% (銷售分成)'; document.getElementById('label-val-slottingmsg').innerText = this.value === 0 ? '不付通道費，僅能陳列於角落最底層貨架' : '提高在統一超、好市多等通路的貨架曝光，銷售量預估放大 ' + (1 + this.value*0.08).toFixed(2) + ' 倍！'"
                           class="w-2/3 cursor-pointer accent-yellow-600">
                    <div class="text-[10px] text-gray-400 font-mono flex-1">
                         <span id="label-val-slottingmsg">提高超商大賣場通路黃金曝光度，銷售量預估大幅提升！</span>
                    </div>
                </div>
                <span class="text-[10px] text-gray-500 block mt-2">※ 與 retail (百貨零售) 板塊產生實質生態共生。支付的通道提成越高，貨架曝光極佳，出貨銷路成倍暴增；但每筆銷售會被大通路抽取對應趴數的分成。</span>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-C. 商用原物料與烘焙 (b2b_ingredients) UI
    // ==========================================
    renderB2bUI(corp, isReadOnly) {
        const state = corp.foodState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-purple-400 font-bold mb-2 text-md">🍞 商用原物料與烘焙 (B2B Ingredients)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">商用油脂與麵粉是連鎖餐飲大廠的幕後基石。B2B 模式不需行銷，而是需要拉低讓利競標下游快餐長約，收割無懼景氣波動的被動長約日營收；此模式唯一的阿基里斯之踵是食安地雷，務必導入產銷溯源！</p>`;

        // A. 狀態儀表
        html += `<div class="grid grid-cols-3 gap-2.5 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">承包長約大單數</div>
                <div class="text-purple-400 font-mono font-bold mt-0.5">${state.activeContracts.length} 筆合約</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">區塊鏈產銷溯源防線</div>
                <div class="text-green-400 font-bold mt-0.5">
                    ${state.blockchainSafe ? '🥇 已開通 (100%食安免疫)' : '🥉 未建立 (食安地雷機率 0.5%)'}
                </div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">長約投標競標折扣</div>
                <div class="text-yellow font-mono font-bold mt-0.5">${state.contractDiscount}% 折扣</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 合約折扣設定與食安溯源
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">⚖️ B2B 下游餐飲大廠供應長約競標設定</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-purple-800 border-opacity-40 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="flex justify-between text-xs text-gray-300 mb-1">
                    <span>⚖️ 下次投標續約時長合約讓利折扣比：</span>
                    <span class="text-yellow-500 font-bold" id="label-val-b2bdiscount">${state.contractDiscount}% (價格讓利)</span>
                </div>
                <div class="flex gap-4 items-center">
                    <input type="range" min="0" max="30" step="2" value="${state.contractDiscount}" 
                           onchange="CEO_FOOD.changeContractDiscount('${corp.id}', this.value)"
                           oninput="document.getElementById('label-val-b2bdiscount').innerText = this.value + '% (價格讓利)'; document.getElementById('label-val-b2bmsg').innerText = '讓利越狠中標率越高 (預估中標率: ' + Math.min(95, 20 + this.value*3.5).toFixed(0) + '%)，但會稀釋合約毛利率！'"
                           class="w-2/3 cursor-pointer accent-purple-500">
                    <div class="text-[10px] text-gray-400 font-mono flex-1">
                         <span id="label-val-b2bmsg">大廠長約投標折扣策略調整，價格決定續約機率！</span>
                    </div>
                </div>
                <span class="text-[10px] text-gray-500 block mt-2">※ 每日有 1.5% 機率隨機觸發下游大廠（如麥當勞、連鎖超商、麵包廠）的採購招標，競標中標可持續獲得穩定的 90 天長約日營收分成！</span>
            </div>`;

            // C. 溯源防護盾
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">🛡️ 食安海嘯防護盾：建立區塊鏈產銷食安溯源 (Blockchain Traceability)</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            
            let blockchainCost = isFirstYearSubsidized ? 48000000 : 60000000;

            html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] flex justify-between items-center text-xs">
                <div class="w-2/3">
                    <div class="font-bold text-green-400">🛡️ 導入區塊鏈產銷食安溯源防盾</div>
                    <p class="text-[10px] text-gray-400 mt-1">從源頭大宗飼料油脂到出廠全面區塊鏈存證，完全免疫每日 0.1% 隨機爆發的食安毒原料風暴！**若爆發食安風暴而無此防護，所有 B2B 客戶將瞬間解約大單，且面臨巨額天價罰款、股價崩盤 60%**！</p>
                </div>
                ${!state.blockchainSafe ? `
                    <button onclick="CEO_FOOD.upgradeBlockchain('${corp.id}')" class="btn-retro px-3 py-2 border-green-500 text-green-400 hover:bg-green-950 bg-opacity-20 font-bold transition animate-pulse">
                        引進區塊鏈安全溯源 (-$${app.formatMoney(blockchainCost)})
                    </button>
                ` : `
                    <button disabled class="btn-retro px-3 py-2 border-gray-800 text-gray-600 font-bold cursor-not-allowed">
                        🛡️ 區塊鏈溯源已生效 (100%防禦)
                    </button>
                `}
            </div>`;
        }

        // D. 長期供應合約列表
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">📋 B2B 承包中之連鎖餐飲大單合約 (${state.activeContracts.length} 案執行中)</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.activeContracts.length > 0) {
            state.activeContracts.forEach(c => {
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2.5 last:border-0 text-gray-300">
                    <div>
                        <div class="text-purple-400 font-bold">🍞 下游 ${c.clientName} 商用原料獨家長合約</div>
                        <div class="text-[10px] text-gray-400 mt-0.5">每日生產成本: -$${app.formatMoney(c.dailyCost)}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-green-400 font-mono font-bold">被動日營收: +$${app.formatMoney(c.dailyRev)}</div>
                        <div class="text-[10px] text-yellow-500 mt-0.5">合約賸餘: ${c.daysLeft} 天</div>
                    </div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前無任何執行中的大廠長約。請拉高招標讓利折扣率等待競標通知。</div>`;
        }
        html += `</div>`;

        return html;
    },

    // ==========================================
    // 2-D. 全球連鎖快餐與餐飲 (qsr_dining) UI
    // ==========================================
    renderDiningUI(corp, isReadOnly) {
        const state = corp.foodState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-green-400 font-bold mb-2 text-md">🍔 全球連鎖快餐與餐飲 (QSR & Dining)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">連鎖餐飲處於供應鏈最終端，具有極致強悍的「定價權護城河」。高通膨與缺工環境下，門市基層人事成本會暴增；此時投資「自助點餐機」與「自動化廚房」，能永久砍除 40% 人事費，鎖定被動暴利！</p>`;

        // A. 狀態
        html += `<div class="grid grid-cols-4 gap-2.5 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">全球連鎖門市</div>
                <div class="text-green-400 font-mono font-bold mt-0.5">${state.storeCount.toLocaleString()} 家</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">菜單售價調幅</div>
                <div class="text-yellow font-bold mt-0.5">${state.menuMarkup >= 0 ? '+' : ''}${state.menuMarkup}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">自動化廚房級別</div>
                <div class="text-cyan font-mono font-bold mt-0.5">Lv ${state.autoLevel} / 3</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400">數位點餐機/外送App</div>
                <div class="text-purple-400 font-bold mt-0.5">${state.kioskEnabled ? '🥇 部署完畢' : '🥉 常規人工'}</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 菜單定價
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">⚖️ 連鎖菜單價格調整與品牌溢價抗性 (Menu Pricing)</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-green-800 border-opacity-40 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="flex justify-between text-xs text-gray-300 mb-1">
                    <span>🏷️ 菜單售價相較於基準調幅：</span>
                    <span class="text-yellow-500 font-bold" id="label-val-menuprec">${state.menuMarkup >= 0 ? '+' : ''}${state.menuMarkup}%</span>
                </div>
                <div class="flex gap-4 items-center">
                    <input type="range" min="-20" max="50" step="1" value="${state.menuMarkup}" 
                           onchange="CEO_FOOD.changeMenuMarkup('${corp.id}', this.value)"
                           oninput="document.getElementById('label-val-menuprec').innerText = (this.value >= 0 ? '+' : '') + this.value + '%'"
                           class="w-2/3 cursor-pointer accent-green-500">
                    <div class="text-[10px] text-gray-400 font-mono flex-1">
                         <span class="text-yellow">麥當勞星巴克強大品牌護城河，調漲 10%-15% 以內流失客流極少，輕鬆將通膨成本完全轉嫁！</span>
                    </div>
                </div>
                <span class="text-[10px] text-gray-500 block mt-2">※ 警告：定價策略有彈性閾值！一旦漲幅過於貪婪（超過 25%），將徹底擊穿顧客承受底線，引發全社會大規模罷買抵制，導致客流量雪崩大跌！</span>
            </div>`;

            // C. 自動化與點餐機升級
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">🤖 連鎖門市自動化與數位點餐減員 CAPEX (Menu Pricing)</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            
            let autoUpgrade2Cost = isFirstYearSubsidized ? 24000000 : 30000000;
            let autoUpgrade3Cost = isFirstYearSubsidized ? 80000000 : 100000000;
            let kioskCost = isFirstYearSubsidized ? 16000000 : 20000000;
            let store10Cost = isFirstYearSubsidized ? 32000000 : 40000000;

            html += `<div class="grid grid-cols-3 gap-2.5 mb-5 text-xs">
                <div class="bg-gray-950 p-2.5 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-cyan text-xs">🤖 升級自動化烹飪廚房</div>
                        <p class="text-[10px] text-gray-400 mt-1">導入自動煎烤機。Lv 2 人事費減免 15%；Lv 3 減免 30%！</p>
                    </div>
                    ${state.autoLevel === 1 ? `
                        <button onclick="CEO_FOOD.upgradeAutoKitchen('${corp.id}', 2)" class="btn-retro py-1 text-[10px] border-cyan text-cyan font-bold transition">
                            升級 Lv 2 廚房 (-$${app.formatMoney(autoUpgrade2Cost)})
                        </button>
                    ` : (state.autoLevel === 2 ? `
                        <button onclick="CEO_FOOD.upgradeAutoKitchen('${corp.id}', 3)" class="btn-retro py-1 text-[10px] border-yellow text-yellow font-bold transition animate-pulse">
                            升級 Lv 3 廚房 (-$${app.formatMoney(autoUpgrade3Cost)})
                        </button>
                    ` : `
                        <button disabled class="btn-retro py-1 text-[10px] border-gray-800 text-gray-600 font-bold cursor-not-allowed">
                            自動廚房已達最高 Lv 3
                        </button>
                    `)}
                </div>
                <div class="bg-gray-950 p-2.5 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-purple-400 text-xs">🎟️ 引入自助點餐機與App</div>
                        <p class="text-[10px] text-gray-400 mt-1">裁減門市前台點餐店員，全面進入數位化點餐！人事費額外減免 20%！</p>
                    </div>
                    ${!state.kioskEnabled ? `
                        <button onclick="CEO_FOOD.upgradeKiosk('${corp.id}')" class="btn-retro py-1 text-[10px] border-purple-500 text-purple-400 font-bold transition animate-pulse">
                            引入數位點餐 (-$${app.formatMoney(kioskCost)})
                        </button>
                    ` : `
                        <button disabled class="btn-retro py-1 text-[10px] border-gray-800 text-gray-600 font-bold cursor-not-allowed">
                            點餐機App已完全開通
                        </button>
                    `}
                </div>
                <div class="bg-gray-950 p-2.5 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">🍔 全球快餐連鎖大展店</div>
                        <p class="text-[10px] text-gray-400 mt-1">在全球繁華商業區大批量擴張 10 家連鎖店面！大幅推升基礎來客流量！</p>
                    </div>
                    <button onclick="CEO_FOOD.expandDiningStores('${corp.id}', 10)" class="btn-retro py-1 text-[10px] border-green-500 text-green-400 font-bold transition">
                        擴建 10 家加盟店 (-$${app.formatMoney(store10Cost)})
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 3. 玩家操作互動 (Actions)
    // ==========================================
    
    // 大宗農牧 Action: 穀物期貨避險鎖價比
    changeHedgingRatio(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;
        
        corp.foodState.hedgingRatio = parseInt(value);
        app.log(`【穀物避險設定】${corp.name} 將大宗穀物期貨鎖定避險比率調整為: ${value}%。合約鎖定價格為 $100。`, "text-yellow");
        this.refreshFoodTabUI(corp);
    },

    // 大宗農牧 Action: 採購戰備現貨庫存
    buyStockpile(corpId, days) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;

        let agriPrice = (app.state && app.state.agriIndex) ? app.state.agriIndex : 100.0;
        let cost = days * agriPrice * corp.foodState.capacity * 6; // 根據產能與當前現貨價格計算一次性採購費

        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost;
            corp.foodState.stockpile += days;
            app.log(`【建立戰備大宗現貨】🌾 ${corp.name} 斥資 $${app.formatMoney(cost)} 一次性從期貨現貨市場買斷囤積了額外 ${days} 天的大宗黃小玉實物現貨！避開通膨穀物價格飆漲！`, "text-cyan font-bold");
            this.refreshFoodTabUI(corp);
        } else {
            app.log(`【資金不足】建立戰備穀物庫存需要 $${app.formatMoney(cost)} 的大額現金儲備！`, "text-red-500");
        }
    },

    // 大宗農牧 Action: 升級生物安全水簾舍
    upgradeBiosecurity(corpId, level) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;

        let cost = level === 2 ? 30000000 : 100000000;
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            corp.foodState.biosecurityLevel = level;
            let subMsg = isFirstYearSubsidized ? ` (獲國家農業法案 20% 設施改建補貼減免)` : '';
            app.log(`【水簾防疫舍升級】🦠 ${corp.name} 斥資 $${app.formatMoney(finalCost)}${subMsg} 成功將全廠畜舍與防疫升級至等級 ${level}！重大疫病爆發染疫率與損失狂降！`, "text-green-400 font-bold");
            this.refreshFoodTabUI(corp);
        } else {
            app.log(`【資金不足】升級水簾負壓防疫舍需要 $${app.formatMoney(finalCost)} 現金！`, "text-red-500");
        }
    },

    // 大宗農牧 Action: 擴建農產能
    expandAgriCapacity(corpId, count) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;

        let cost = 20000000;
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            corp.foodState.capacity += count;
            let subMsg = isFirstYearSubsidized ? ` (享擴產資金政策性 20% 減免)` : '';
            app.log(`【大宗農牧產線擴建】🌾 ${corp.name} 斥資 $${app.formatMoney(finalCost)}${subMsg} 成功將日最大飼料畜產麵粉噸數擴建提升 ${count} 噸！大批量生產出貨力增強。`, "text-green-400 font-bold");
            this.refreshFoodTabUI(corp);
        } else {
            app.log(`【資金不足】擴建大宗農牧大廠房需要 $${app.formatMoney(finalCost)} 現金！`, "text-red-500");
        }
    },

    // 包裝食品 Action: 健康低糖產品比重
    changeHealthRatio(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;
        
        corp.foodState.healthRatio = parseInt(value);
        app.log(`【健康產品重組】${corp.name} 門市低糖與健康商品陳列比重設定為: ${value}%。陳列比重越高利潤與毛利空間越大，但高度考驗品牌聲譽！`, "text-yellow");
        this.refreshFoodTabUI(corp);
    },

    // 包裝食品 Action: 調整低糖低卡研發費
    changeHealthRnd(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;
        
        corp.foodState.healthRndExpense = parseInt(value);
        app.log(`【低糖無糖推廣費設定】${corp.name} 自有燕麥奶/無糖茶飲每日健康推廣行銷費設定為: $${app.formatMoney(value)}/日。`, "text-yellow");
        this.refreshFoodTabUI(corp);
    },

    // 包裝食品 Action: 連鎖超市黃金上架提成比
    changeSlottingFee(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;
        
        corp.foodState.slottingFee = parseInt(value);
        app.log(`【超市通道費設定】${corp.name} 設定給予 Walmart 與統一超等通路的黃金陳列提成分成比率為: ${value}%。分成越高，在超市的曝光銷路呈幾何級暴漲！`, "text-yellow");
        this.refreshFoodTabUI(corp);
    },

    // 商用原料 Action: 競標讓利折扣率設定
    changeContractDiscount(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;
        
        corp.foodState.contractDiscount = parseInt(value);
        app.log(`【長約投標競標折扣】${corp.name} 招商競標讓利折扣拉桿設定為: ${value}%。讓利越高中標連鎖長約機率大幅上升，但會微幅壓縮該合約毛利率！`, "text-yellow");
        this.refreshFoodTabUI(corp);
    },

    // 商用原料 Action: 建立食安溯源區塊鏈系統
    upgradeBlockchain(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;

        const state = corp.foodState;
        if (state.blockchainSafe) return;

        let cost = 60000000;
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            state.blockchainSafe = true;
            let subMsg = isFirstYearSubsidized ? ` (獲食品安全防禦特殊專款 20% 大額資金減免)` : '';
            app.log(`【食安溯源區塊鏈開通】🛡️ ${corp.name} 斥資 $${app.formatMoney(finalCost)}${subMsg} 全面引入區塊鏈產銷履歷系統！100% 免疫隨機劣質食安黑心風暴，徹底封鎖系統致命解約地雷！`, "text-green-400 font-bold animate-pulse");
            this.refreshFoodTabUI(corp);
        } else {
            app.log(`【資金不足】引進區塊鏈食安溯源系統需要 $${app.formatMoney(finalCost)} 現金！`, "text-red-500");
        }
    },

    // 連鎖餐飲 Action: 調整菜單 markup
    changeMenuMarkup(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;
        
        corp.foodState.menuMarkup = parseInt(value);
        app.log(`【菜單價格調整】${corp.name} 將連鎖菜單價格相較於基準調整為: ${value >= 0 ? '+' : ''}${value}%。漲價過高（超過 25%）將引起消費者大抵制與客流量雪崩！`, "text-yellow");
        this.refreshFoodTabUI(corp);
    },

    // 連鎖餐飲 Action: 升級自動化烹飪廚房
    upgradeAutoKitchen(corpId, level) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;

        let cost = level === 2 ? 30000000 : 100000000;
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            corp.foodState.autoLevel = level;
            let subMsg = isFirstYearSubsidized ? ` (獲振興自動化與AI特殊補貼 20% 資金大額減免)` : '';
            app.log(`【自動化烹飪廚房導入】🤖 ${corp.name} 斥資 $${app.formatMoney(finalCost)}${subMsg} 成功為旗下門市廚房升級自動化烹飪與煎烤設備！大幅縮減每家門市基層員工人事負擔。`, "text-cyan font-bold animate-pulse");
            this.refreshFoodTabUI(corp);
        } else {
            app.log(`【資金不足】升級自動化烹飪廚房需要 $${app.formatMoney(finalCost)} 現金！`, "text-red-500");
        }
    },

    // 連鎖餐飲 Action: 引入點餐機
    upgradeKiosk(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;

        const state = corp.foodState;
        if (state.kioskEnabled) return;

        let cost = 20000000;
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            state.kioskEnabled = true;
            let subMsg = isFirstYearSubsidized ? ` (獲數字化建設補貼 20% 減免)` : '';
            app.log(`【自助點餐與App系統部署】🎟️ ${corp.name} 斥資 $${app.formatMoney(finalCost)}${subMsg} 順利在旗下連鎖店面全面推行「自助點餐機」與「專屬外送點餐 App」！裁減前台基層收銀店員，長期人事費用大降。`, "text-cyan font-bold animate-pulse");
            this.refreshFoodTabUI(corp);
        } else {
            app.log(`【資金不足】全面引進數位自助點餐機 App 系統需要 $${app.formatMoney(finalCost)} 現金！`, "text-red-500");
        }
    },

    // 連鎖餐飲 Action: 加盟展店
    expandDiningStores(corpId, count) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.foodState) return;

        let cost = 40000000;
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            corp.foodState.storeCount += count;
            let subMsg = isFirstYearSubsidized ? ` (獲連鎖振興展店津貼 20% 大額資金減免)` : '';
            app.log(`【全球加盟店鋪展店】🍔 ${corp.name} 斥資 $${app.formatMoney(finalCost)}${subMsg} 順利在全球各大一線商務圈增設了 ${count} 家全新連鎖加盟店面！被動來客規模大增。`, "text-green-400 font-bold");
            this.refreshFoodTabUI(corp);
        } else {
            app.log(`【資金不足】全球大批量展店需要 $${app.formatMoney(finalCost)} 現金！`, "text-red-500");
        }
    },

    // 輔助更新 UI
    refreshFoodTabUI(corp) {
        const contentArea = document.getElementById('ceo-detail-tab-content');
        if (contentArea) {
            const isReadOnly = corp.isPlayerFounded ? false : (corp.playerRole ? false : true);
            this.renderFoodTab(corp, contentArea, isReadOnly);
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
        if (!corp.foodState) this.initAssets(corp);
        
        const state = corp.foodState;
        let daysOldForSub = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOldForSub <= 90) || (corp.isListed && ipoDaysOld <= 90);
        
        let dailyRev = 0;
        let dailyExp = 0;
        
        let rti = app.state.RTI || 100; // 百貨大眾消費指數 (與零售共生連動)
        let pMult = app.state.priceMultiplier || 1.0; // 通貨膨脹物價乘數

        // 自主維護並波動全域大宗穀物期貨指數 (避險沙盒機制)
        if (typeof app !== 'undefined' && app.state) {
            if (!app.state.agriIndex) app.state.agriIndex = 100.0;
            
            // 每日大宗穀物隨機小幅波動
            app.state.agriIndex = Math.max(50.0, Math.min(250.0, app.state.agriIndex + (Math.random() * 2.0 - 1.0)));
            
            // 每日有 0.3% 機率突發世界氣候大旱大宗穀物歉收事件 (Drought)
            if (Math.random() < 0.003 && state.droughtDaysLeft === 0) {
                state.droughtDaysLeft = 30; // 氣候大旱 30 天
                app.state.agriIndex += 45.0 + Math.random() * 25.0; // 大宗期貨大漲 45%~70%！
                app.log("【🌾 總體經濟：國際大旱歉收事件】大旱席捲美洲平原！黃小玉大宗原物料大恐慌性暴漲！國際大宗穀物期貨指數瞬間飆升！", "text-red-400 font-bold animate-pulse");
            }
        }
        let agriPrice = (app.state && app.state.agriIndex) ? app.state.agriIndex : 100.0;

        if (state.droughtDaysLeft > 0) {
            state.droughtDaysLeft--;
        }

        // ------------------------------------------
        // A. 大宗農牧與原物料 (agri_commodity)
        // ------------------------------------------
        if (corp.bizModel === 'agri_commodity') {
            // 基礎行政與設備折舊折舊
            dailyExp += state.capacity * 25;

            // 處理禽流感/非洲豬瘟疫病停工整改
            if (state.pigFluDaysLeft > 0) {
                state.pigFluDaysLeft--;
                dailyRev = 0; // 全廠被撲殺，營收強行歸零！
                // 日常維持維持費用仍需支出
            } else {
                // 1. 大宗穀物採購進料與避險結算
                let finalAgriCost = agriPrice;
                let stockpileActive = false;

                if (state.stockpile > 0) {
                    // 有戰備囤積現貨庫存天數
                    state.stockpile--;
                    finalAgriCost = 80.0; // 庫存均價成本定在極低防禦水準 80
                    stockpileActive = true;
                } else {
                    // 常規現貨現採 + 期貨鎖合約避險
                    let ratio = state.hedgingRatio / 100;
                    finalAgriCost = agriPrice * (1 - ratio) + state.lockedPrice * ratio;
                }

                // 2. 出廠報價利潤
                let factoryOutPrice = agriPrice * 1.15 * pMult; // 原物料隨行就市出廠，獲利大宗穀物銷售
                let rawRevenue = state.capacity * factoryOutPrice * 6; // 噸換算金額規模
                let rawExpense = state.capacity * finalAgriCost * 6 * 0.40; // 40% 工料與配合飼料等成本

                dailyRev += rawRevenue;
                dailyExp += rawExpense;

                // 3. 戰備庫存的每日微小倉儲折舊費
                if (state.stockpile > 0) {
                    dailyExp += state.stockpile * 200;
                }

                // 4. 每日隨機豬瘟/禽流感疫病判定 (玩家與 NPC 皆適用，確保市場真實波動)
                let fluChance = { 1: 0.002, 2: 0.0005, 3: 0.00005 };
                // NPC 公司疫病機率縮小至 1/3，避免市場過度動盪
                let currentChance = (fluChance[state.biosecurityLevel] || 0.002) * (corp.isPlayerFounded ? 1.0 : 0.33);
                if (Math.random() < currentChance && state.pigFluDaysLeft === 0) {
                    // 中鏢非洲豬瘟/禽流感
                    state.pigFluDaysLeft = 30; // 停工撲殺整改 30 天
                    state.stockpile = 0; // 庫存被污染，現貨全面撲殺銷毀
                    corp.price = Math.max(0.1, corp.price * 0.75); // 股價大跌 25%
                    if (corp.isPlayerFounded) {
                        app.log(`【💥 致命生物危機：爆發禽流感/豬瘟】大宗農牧大廠 ${corp.name} 養殖廠內驚傳突發疫病陽性！判定防疫失守！勒令全廠立即實施畜群全面撲殺並停工整改 30 天，股價面臨重挫跌停！`, "text-red-500 font-bold animate-pulse");
                        this.refreshFoodTabUI(corp);
                    } else {
                        app.log(`【市場事件】${corp.name} 爆發農場疫病，勒令停工 30 天，股價重跌。`, "text-red-400");
                    }
                }
            }

            // 雙軌政策保護：自創或上市初期日常折舊與維持費減半
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += state.capacity * 60; // 國家政策保證津貼
            }
        }
        
        // ------------------------------------------
        // B. 包裝食品與飲料 (fmcg_beverage)
        // ------------------------------------------
        else if (corp.bizModel === 'fmcg_beverage') {
            const p = corp.price || corp.basePrice || 100;
            const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;
            
            // 每日傳統包裝折舊與行銷維持
            dailyExp += 15000 * scale;
            dailyExp += state.healthRndExpense; // 研發廣告推廣費支出

            // 品牌健康聲譽日更新
            if (state.healthRndExpense >= 20000) {
                state.healthReputation = Math.min(100, state.healthReputation + 0.15);
            } else if (state.healthRndExpense < 5000) {
                state.healthReputation = Math.max(10, state.healthReputation - 0.08);
            }

            // 與 retail (百貨零售) 板塊的共生連動 (RTI 飆高，銷量放大)
            let baseTraffic = 15000 * scale * (rti / 100);

            // 超市通路上架分成曝光拉升 (最多拉升 2.2 倍銷量)
            let exposureBoost = 1.0 + (state.slottingFee / 10) * 0.8;
            let finalSalesQty = baseTraffic * exposureBoost;

            // 上游穀物飼料原物料通膨長鞭效應 (原料飆漲，產品生產成本上升)
            let rawCommodityInflation = agriPrice > 120 ? (agriPrice - 120) * 0.01 : 0; // 進貨材料加成

            // 1. 傳統含糖常規食品 (低毛利率 25% | 逐漸被市場邊緣化)
            let legacyRatio = (100 - state.healthRatio) / 100;
            let legacySales = finalSalesQty * legacyRatio * 180 * pMult;
            let legacyCost = legacySales * 0.75 * (1 + rawCommodityInflation); // 基礎工料成本 75%

            dailyRev += legacySales;
            dailyExp += legacyCost;

            // 2. 健康低卡燕麥奶與植物肉食品 (高毛利率 55% | 轉換率受健康聲譽高度拉動)
            let healthRatioDec = state.healthRatio / 100;
            let healthPurchaseChance = state.healthReputation / 100; // 聲譽越好轉換極佳
            let healthSales = finalSalesQty * healthRatioDec * healthPurchaseChance * 260 * pMult;
            let healthCost = healthSales * 0.45 * (1 + rawCommodityInflation); // 基礎材料成本 45%

            dailyRev += healthSales;
            dailyExp += healthCost;

            // 3. 通路上架費銷售分成扣減支出
            let slottingComm = (legacySales + healthSales) * (state.slottingFee / 100);
            dailyExp += slottingComm;

            // 雙軌政策保護
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += 30000;
            }
        }
        
        // ------------------------------------------
        // C. 商用原物料與烘焙 (b2b_ingredients)
        // ------------------------------------------
        else if (corp.bizModel === 'b2b_ingredients') {
            const p = corp.price || corp.basePrice || 100;
            const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;

            // 基礎大型麵粉烘焙油脂廠房折舊水電
            dailyExp += 25000 * scale;

            // 處理劣質原料食安處罰停工整改中
            if (state.foodSafetyRiskDays > 0) {
                state.foodSafetyRiskDays--;
                dailyRev = 0; // 客戶全數解約且被勒令封鎖，營收強行歸零！
                // 日常維護仍需扣減
            } else {
                // 1. 正常結算在手供應長約日分成
                // 上游原料通膨對烘焙油脂商用原料成本之壓縮
                let rawInflation = agriPrice > 120 ? (agriPrice - 120) * 0.008 : 0;

                state.activeContracts.forEach(c => {
                    dailyRev += c.dailyRev;
                    dailyExp += c.dailyCost * (1 + rawInflation);
                });

                // 承包長約的天數扣減與自然到期
                for (let i = state.activeContracts.length - 1; i >= 0; i--) {
                    let c = state.activeContracts[i];
                    c.daysLeft--;
                    if (c.daysLeft <= 0) {
                        app.log(`【長約合約到期】${corp.name} 供應給 [下游 ${c.clientName}] 的商用原物料長約供貨期屆滿，被動合約結束。`, "text-yellow");
                        state.activeContracts.splice(i, 1);
                    }
                }

                // 2. 每日隨機下游餐飲/超市巨頭供應商招標競標機會 (玩家 1.5%，NPC 0.5%)
                const bidChance = corp.isPlayerFounded ? 0.015 : 0.005;
                if (Math.random() < bidChance) {
                    this.triggerB2bBiddingProcess(corp);
                }

                // 3. 每日食安地雷危機判定 (玩家 0.1%，NPC 0.03%，未引進區塊鏈時)
                const safetyChance = corp.isPlayerFounded ? 0.001 : 0.0003;
                if (!state.blockchainSafe && Math.random() < safetyChance) {
                    state.foodSafetyRiskDays = 60; // 停工處罰整改 60 天
                    state.activeContracts = []; // 所有下游大客戶全面解約
                    corp.price = Math.max(0.1, corp.price * 0.40); // 股價崩盤大跌 60%！
                    if (corp.isPlayerFounded) {
                        app.log("【💥 致命食安危機：爆發黑心餿水油風暴】毀滅性大地震！主管機關檢驗出商用原料內摻雜黑心毒原料！爆發全社會抗議大風暴！因無區塊鏈溯源履歷無法證清，所有 B2B 下游餐飲巨頭客戶全面在第一時間單方面無條件解約！全廠勒令停工整改 60 天並面臨天價重罰！股價雪崩重下瀉 60%！", "text-red-500 font-bold animate-pulse");
                        this.refreshFoodTabUI(corp);
                    } else {
                        app.log(`【市場事件】${corp.name} 爆發食安風暴，所有合約解除，股價崩跌 60%。`, "text-red-400");
                    }
                }
            }

            // 雙軌政策保護
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += 30000;
            }
        }
        
        // ------------------------------------------
        // D. 全球連鎖快餐與餐飲 (qsr_dining)
        // ------------------------------------------
        else if (corp.bizModel === 'qsr_dining') {
            const p = corp.price || corp.basePrice || 100;
            const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;

            // 1. 基層店員門市人事工資與水電鋪位租金支出
            let baseWage = state.storeCount * 8000; // 人手需求開支大
            
            // 自動化升級與數位點餐機對人手人事工資之免除
            let payrollReduction = 0;
            if (state.kioskEnabled) {
                payrollReduction += 0.20; // 自助點餐省 20%
            }
            let autoKitchenReduction = { 1: 0, 2: 0.15, 3: 0.30 };
            payrollReduction += (autoKitchenReduction[state.autoLevel] || 0);

            // 實際人事費
            let finalPayroll = baseWage * (1 - payrollReduction);
            dailyExp += finalPayroll + state.storeCount * 3000 * scale; // 加租金折舊

            // 2. 來客數與售價策略判定 (麥當勞定價權溢價)
            let markup = state.menuMarkup; // -20% 至 +50%
            let trafficLoss = 0;
            
            if (markup > 0) {
                if (markup <= 15) {
                    trafficLoss = markup * 0.2; // 調漲 15% 以內流失極微 (定價權護城河)
                } else if (markup <= 25) {
                    trafficLoss = 15 * 0.2 + (markup - 15) * 1.5; // 調漲超過 15%，流失加速
                } else {
                    trafficLoss = 15 * 0.2 + 10 * 1.5 + (markup - 25) * 4.0; // 超過 25% 暴漲抵制
                }
            } else if (markup < 0) {
                trafficLoss = markup * 0.4; // 降價促銷吸引少量額外客流
            }

            let trafficMultiplier = Math.max(0.1, 1 - (trafficLoss / 100)); // 客流係數

            // 門市總客流量 (受展店規模、RTI 大眾消費、通膨轉嫁抗性共同影響)
            let traffic = state.storeCount * state.baseTraffic * (rti / 100) * trafficMultiplier;

            // 上游大宗原料與食品通膨 Domino 傳導 (若黃小玉大漲，食材進料成本亮紅燈)
            let ingredientCostMultiplier = 1.0;
            if (agriPrice > 120) {
                ingredientCostMultiplier = 1.0 + (agriPrice - 120) * 0.008; // 原料通膨傳導至食材
            }

            // 3. 連鎖餐飲營收與食材工本結算 (基礎客單價均價 $220)
            let ticketPrice = 220 * (1 + markup / 100) * pMult;
            let diningRevenue = traffic * ticketPrice;
            
            // 食材基礎比例 40% (受通膨指數食材拉抬)
            let diningCost = traffic * (220 * 0.40 * ingredientCostMultiplier);

            dailyRev += diningRevenue;
            dailyExp += diningCost;

            // 雙軌政策保護
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += 45000;
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
    },

    // ==========================================
    // 5. 突發隨機競標事件 (B2B Contract Bidding)
    // ==========================================
    triggerB2bBiddingProcess(corp) {
        const state = corp.foodState;
        
        // 隨機抽取下游一家大型連鎖餐飲或賣場大廠
        const clients = ['麥當勞連鎖快餐', '好市多連鎖量販', '全家超商鮮食部', '星巴克甜點部', '大型國際連鎖超市'];
        let client = clients[Math.floor(Math.random() * clients.length)];

        // 競標成功機率受 讓利折扣拉桿 contractDiscount 支配 (0% ~ 30%)
        // 讓利越高，續約中標機率越高，但毛利會微幅壓縮
        let successChance = 0.20 + (state.contractDiscount / 100) * 3.5; // 折扣 20% 時，成功率達 90%
        
        let p = corp.price || corp.basePrice || 100;
        let scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;
        let tenderName = `${client} 全省烘焙油脂麵粉獨家供應長約案`;

        if (Math.random() < successChance) {
            // 中標大單！
            // 中標日分成營收：讓利折扣越重，折扣係數 (1 - contractDiscount/100) 越低，毛利稀釋
            let discountFactor = 1 - (state.contractDiscount / 100);
            let dailyRev = Math.floor(scale * 120000 * discountFactor);
            
            // 基礎工料成本為 $30,000 美金比例
            let dailyCost = Math.floor(scale * 30000);

            state.activeContracts.push({
                id: `C-${Date.now()}`,
                clientName: client,
                dailyRev: dailyRev,
                dailyCost: dailyCost,
                daysLeft: 90 // 供貨合約 90 天
            });

            let profitColor = dailyRev >= dailyCost ? 'text-green-400 font-bold' : 'text-red-400 font-bold animate-pulse';
            app.log(`【🤝 B2B 長約競標大得標】喜報！商用烘焙油脂原料廠 ${corp.name} 順利中標 [${tenderName}]！投標讓利折扣為 ${state.contractDiscount}%。每日被動供應日營收 +$${app.formatMoney(dailyRev)}，每日工料成本 -$${app.formatMoney(dailyCost)} (合約每日純毛利: <span class="${profitColor}">+$${app.formatMoney(dailyRev - dailyCost)}</span>)！大單承包持續供貨 90 天！`, "text-purple-400 font-bold animate-pulse");
        } else {
            app.log(`【B2B 合約流標】原物料廠 ${corp.name} 參與 [${tenderName}] 競投，因讓利折扣報價誠意不足，宣告流標。請CEO拉高招標讓利折扣率！`, "text-gray-400");
        }
        
        this.refreshFoodTabUI(corp);
    }
};

window.CEO_FOOD = CEO_FOOD;
