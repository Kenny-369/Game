// ceo_finance.js - 金融與保險產業（四大商業模型）核心模擬子系統
const CEO_FINANCE = {
    // ==========================================
    // 1. 初始化資產 (Init Assets)
    // ==========================================
    initAssets(corp) {
        if (!corp.financeState) {
            corp.financeState = {
                // 通用金融狀態
                lastBcf: 1.0, // 金融週期熱度影響因子
                
                // 商業銀行 (commercial)
                depositBalance: 0,     // 總存款餘額 (Liabilities)
                lendingBalance: 0,     // 總放款餘額 (Assets)
                depositRate: 0.015,     // 存款利率 (預設 1.5%)
                lendingRate: 0.050,     // 放款利率 (預設 5.0%)
                ltvThreshold: 0.70,     // 放款信評寬鬆度 (LTV 70%)
                defaultRate: 0.01,      // 當前呆帳率
                bankRunDaysLeft: 0,     // 擠兌危機整改剩餘天數 (為0代表正常)
                
                // 投資銀行與資管 (investment)
                propTradingPool: 0,     // 自營部交易資金池
                propDirection: 'long',  // 自營部多空方向 ('long', 'short', 'none')
                propLeverage: 1,        // 自營部槓桿倍數 (1x ~ 10x)
                underwritingPipeline: [], // 承銷中的企業 IPO/SEO 專案: { id, clientName, type, targetCap, feeRate, daysLeft }
                
                // 保險與壽險 (insurance)
                floatPool: 0,           // 浮存金總資金池
                premiumPricing: 100,    // 保單定價指數 (100為基準)
                floatAllocation: {
                    conservative: 0.50, // 保守型 (政府公債 3%)
                    balanced: 0.40,     // 平衡型 (藍籌股投資)
                    aggressive: 0.10    // 激進型 (高風險期指自營)
                },
                lastCatastropheClaim: 0, // 最近一次理賠金額
                
                // 支付與特許融資 (payment)
                activeUsers: 1000,      // 會員發卡數
                partnerStores: 50,      // 特約商店數
                bnplBalance: 0,         // 先買後付高利貸在手餘額
                bnplInterestRate: 0.12  // BNPL 特許放款利率 (12%)
            };
        }

        const state = corp.financeState;
        const p = corp.price || corp.basePrice || 100;
        const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;

        // 玩家創立之公司為空殼金控，不給予初始資源 (依據 user_rules)
        if (corp.isPlayerFounded) {
            if (corp.bizModel === 'commercial') {
                state.depositBalance = 20000000;
                state.lendingBalance = 15000000;
            } else if (corp.bizModel === 'insurance') {
                state.floatPool = 10000000;
            } else if (corp.bizModel === 'payment') {
                state.activeUsers = 2000;
                state.partnerStores = 100;
            }
            return;
        }

        // ==========================================
        // 非玩家（上市公司）根據規模與代表企業給予初始資源
        // ==========================================
        
        // A. 商業銀行 (commercial)
        if (corp.bizModel === 'commercial') {
            const dep = scale * 100000000 + 50000000;
            state.depositBalance = dep;
            state.lendingBalance = Math.floor(dep * 0.75); // 存貸比 75%
            if (['2886', 'JPM', 'BAC'].includes(corp.id)) { // 兆豐金、大摩、美銀
                state.lendingRate = 0.045;
                state.depositRate = 0.012;
                state.ltvThreshold = 0.65;
            } else {
                state.lendingRate = 0.055;
                state.depositRate = 0.018;
                state.ltvThreshold = 0.75;
            }
        }
        
        // B. 投資銀行與資管 (investment)
        else if (corp.bizModel === 'investment') {
            state.propTradingPool = scale * 30000000 + 10000000;
            state.propDirection = Math.random() < 0.6 ? 'long' : 'short';
            state.propLeverage = Math.floor(Math.random() * 3) + 1;
            
            // 初始承銷案
            state.underwritingPipeline.push({
                id: `U-${Date.now()}`,
                clientName: '中鋼特用鋼材',
                type: 'IPO新股上市包銷',
                targetCap: 80000000,
                feeRate: 0.04,
                daysLeft: 8
            });
        }
        
        // C. 保險與壽險 (insurance)
        else if (corp.bizModel === 'insurance') {
            state.floatPool = scale * 80000000 + 30000000;
            state.premiumPricing = 105;
            if (corp.id === 'BRK.B') { // 波克夏
                state.floatAllocation = { conservative: 0.20, balanced: 0.70, aggressive: 0.10 };
            } else {
                state.floatAllocation = { conservative: 0.50, balanced: 0.40, aggressive: 0.10 };
            }
        }
        
        // D. 支付與特許融資 (payment)
        else if (corp.bizModel === 'payment') {
            state.activeUsers = scale * 25000 + 5000;
            state.partnerStores = scale * 800 + 200;
            state.bnplBalance = scale * 15000000 + 5000000;
        }
    },

    // ==========================================
    // 2. UI 渲染派發 (Render)
    // ==========================================
    renderFinanceTab(corp, contentArea, isReadOnly) {
        if (!corp.financeState) this.initAssets(corp);
        let html = `<div class="p-4 bg-black border border-gray-800 rounded crt">`;
        
        let rate = app.state.baseRate || 0.025;
        let rateColor = rate >= 0.04 ? 'text-red-400 font-bold' : 'text-green-400 font-bold';
        
        // 頂部全域宏觀利率與政策補貼橫幅
        html += `<div class="mb-4 text-xs text-gray-300 bg-gray-900 bg-opacity-80 p-3 rounded border border-gray-800 flex justify-between items-center shadow-[inset_0_0_10px_rgba(0,255,0,0.05)]">
            <div>🏦 央行基準利率 (Base Rate): <span class="${rateColor}">${(rate * 100).toFixed(2)}%</span></div>
            <div class="text-xs text-gray-400">※ 基準利率直接影響商銀吸儲放貸成本、投行IPO意願與地產違約機率</div>
        </div>`;

        // 國家金融振興法案 (第一年新創金控補貼)
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        if (isFirstYearSubsidized) {
            html += `<div class="mb-4 text-xs bg-green-950 bg-opacity-30 p-3 rounded border border-green-700 text-green-400 flex flex-col gap-1 shadow-[0_0_15px_rgba(0,255,0,0.1)] animate-pulse">
                <div class="font-bold flex items-center gap-1.5">🟢 國家金融產業扶持法案生效中 (上市/創立前三個月特別護航)</div>
                <div class="text-xs text-gray-300">※ 享有：日常人事與營運折舊成本減免 50% 政策補貼。</div>
                <div class="text-xs text-gray-300">※ 享有：自營部開戶或無卡分期特許立項 20% 資金大額減免。</div>
                ${['commercial', 'payment'].includes(corp.bizModel) ? `<div class="text-xs text-yellow-500 font-bold">※ 特許補貼：因前期市場規模有限，國家每日撥發特許起航保證存款金或息收返還，補貼基本利差營運！</div>` : ''}
            </div>`;
        }

        // 根據 business model 進行 UI 分流
        if (corp.bizModel === 'commercial') {
            html += this.renderCommercialUI(corp, isReadOnly);
        } else if (corp.bizModel === 'investment') {
            html += this.renderInvestmentUI(corp, isReadOnly);
        } else if (corp.bizModel === 'insurance') {
            html += this.renderInsuranceUI(corp, isReadOnly);
        } else if (corp.bizModel === 'payment') {
            html += this.renderPaymentUI(corp, isReadOnly);
        }
        
        html += `</div>`;
        contentArea.innerHTML = html;
    },

    // ==========================================
    // 2-A. 商業銀行 (commercial) 面板
    // ==========================================
    renderCommercialUI(corp, isReadOnly) {
        const state = corp.financeState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let spread = state.lendingRate - state.depositRate;
        let spreadColor = spread > 0.03 ? 'text-green-400 font-bold' : 'text-yellow';

        let html = `<h3 class="text-green-400 font-bold mb-2 text-md flex items-center gap-1">🏦 商業銀行 (Commercial Bank) 存放貸與信評面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">傳統吸儲放貸。CEO 必須在基準利率下設定「存款利率」來吸引散戶存款，並設定「放款利率」來賺取利潤；同時微操「放款審核寬鬆度」來平衡壞帳海嘯與 ROE 暴利！</p>`;

        // A. 銀行基本資產負債表
        html += `<div class="grid grid-cols-4 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">總存款餘額 (Liabilities)</div>
                <div class="text-yellow-400 font-mono font-bold text-xs mt-1">$${app.formatMoney(state.depositBalance)}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">總放款餘額 (Assets)</div>
                <div class="text-green-400 font-mono font-bold text-xs mt-1">$${app.formatMoney(state.lendingBalance)}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">當前存放貸利差 (NIM)</div>
                <div class="${spreadColor} font-mono font-bold text-xs mt-1">${(spread * 100).toFixed(2)}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">放款信用呆帳率</div>
                <div class="font-mono text-xs mt-1 ${state.defaultRate > 0.05 ? 'text-red-500 font-bold animate-pulse' : 'text-gray-400'}">
                    ${(state.defaultRate * 100).toFixed(2)}%
                </div>
            </div>
        </div>`;

        // 處於擠兌警告
        if (state.bankRunDaysLeft > 0) {
            html += `<div class="mb-4 text-xs bg-red-950 bg-opacity-40 p-3 rounded border border-red-500 text-red-500 flex flex-col gap-1 shadow-[0_0_15px_rgba(255,0,0,0.15)] animate-pulse">
                <div class="font-bold flex items-center gap-1.5">🚨 散戶恐慌擠兌危機 (BANK RUN ONGOING)</div>
                <div class="text-xs text-gray-300">※ 警告：金控流動現金過低，存款客戶信心崩塌正發起瘋狂擠兌！</div>
                <div class="text-xs text-gray-300">※ 處理：必須於 <span class="font-bold text-red-400">${state.bankRunDaysLeft} 天內</span> 在營運面板點擊注入緊急準備準備金，否則銀行將被迫破產接管！</div>
            </div>`;
        }

        if (!isReadOnly) {
            // B. 存款與放款利率調整
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">📊 存放貸利率微操 (Rate Configurations)</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="text-xs text-gray-400 block">存款利率 (吸引散戶資金):</label>
                        <div class="flex items-center gap-2">
                            <input type="range" min="0.1" max="6.0" step="0.1" value="${(state.depositRate*100).toFixed(1)}"
                                   onchange="CEO_FINANCE.changeRates('${corp.id}', 'deposit', this.value)"
                                   class="w-2/3 cursor-pointer accent-green-500">
                            <span class="text-yellow font-mono font-bold">${(state.depositRate*100).toFixed(2)}%</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs text-gray-400 block">放款利率 (融資利息營收):</label>
                        <div class="flex items-center gap-2">
                            <input type="range" min="2.0" max="15.0" step="0.2" value="${(state.lendingRate*100).toFixed(1)}"
                                   onchange="CEO_FINANCE.changeRates('${corp.id}', 'lending', this.value)"
                                   class="w-2/3 cursor-pointer accent-green-500">
                            <span class="text-green-400 font-mono font-bold">${(state.lendingRate*100).toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            </div>`;

            // C. 信評審核與 LTV 控制
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">⚖️ 授信審核寬鬆度微操 (LTV Credit Risk Control)</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <p class="text-xs text-gray-400 mb-3">設定放貸抵押率門檻。LTV 越高放貸越寬鬆，放貸餘額會爆量暴增，但一旦房市崩盤或遇到大盤熊市，呆帳比率將成幾何級數海嘯般噴發！</p>
                <div class="flex gap-4 items-center">
                    <input type="range" min="40" max="95" step="5" value="${Math.floor(state.ltvThreshold * 100)}"
                           onchange="CEO_FINANCE.changeLTV('${corp.id}', this.value)"
                           class="w-2/3 cursor-pointer accent-green-500">
                    <div class="text-xs font-mono">
                        <div>放款審核門檻: <span class="text-yellow font-bold">LTV ${Math.floor(state.ltvThreshold * 100)}%</span></div>
                        <div>風險等級: 
                            <span class="font-bold ${state.ltvThreshold >= 0.85 ? 'text-red-500 animate-pulse' : (state.ltvThreshold >= 0.65 ? 'text-yellow' : 'text-green-400')}">
                                ${state.ltvThreshold >= 0.85 ? '☠️ 極度進取 (高壞帳風險)' : (state.ltvThreshold >= 0.65 ? '⚖️ 平衡穩健' : '🛡️ 嚴格保守')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>`;

            // D. 緊急注資準備金
            if (state.bankRunDaysLeft > 0) {
                html += `<h4 class="text-red-500 font-bold text-xs mb-2 border-l-2 border-red-500 pl-1.5">🚨 金控流動性救市撥款</h4>`;
                html += `<div class="bg-red-950 bg-opacity-20 p-3 rounded border border-red-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] flex justify-between items-center">
                    <div>
                        <div class="text-red-400 font-bold">撥付緊急融資存款金 ($30,000,000)</div>
                        <div class="text-xs text-gray-400 mt-0.5">從金控總部撥款以強行打消擠兌恐慌。</div>
                    </div>
                    <button onclick="CEO_FINANCE.injectRescueCapital('${corp.id}')" class="btn-retro text-xs border-red-500 text-red-500 font-bold py-1.5 px-4 hover:bg-red-950 transition">
                        緊急救市注資
                    </button>
                </div>`;
            }
        }

        return html;
    },

    // ==========================================
    // 2-B. 投資銀行與資管 (investment) 面板
    // ==========================================
    renderInvestmentUI(corp, isReadOnly) {
        const state = corp.financeState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-cyan font-bold mb-2 text-md">📊 投資銀行與資管 (Investment Bank) 面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">市場的資本掠奪者。CEO 可將金控現金撥入自營部，開啟高倍數槓桿做多或做空全球大盤；同時雷達承銷企業 IPO 包銷大單，並無腦躺收全市場併購 1% 的 M&A 財務顧問費！</p>`;

        // A. 自營與承銷基本狀態
        html += `<div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">自營交易部總資金</div>
                <div class="text-cyan font-mono font-bold text-xs mt-1">$${app.formatMoney(state.propTradingPool)}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">自營槓桿設定</div>
                <div class="text-yellow font-bold text-xs mt-1">
                    ${state.propDirection === 'none' ? '💤 閒置退場' : `${state.propDirection.toUpperCase()} | ${state.propLeverage}x 槓桿`}
                </div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">全市場 M&A 顧問費分潤權</div>
                <div class="text-green-400 font-bold text-xs mt-1">
                    🟢 特許躺賺激活中 (1% 顧問費)
                </div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 自營交易分配
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">📈 自營交易部高槓桿大盤期貨決策 (Prop Trading Casino)</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            let transCost = isFirstYearSubsidized ? 8000000 : 10000000;

            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] text-xs text-gray-300">
                <div class="grid grid-cols-2 gap-4 border-b border-gray-900 pb-3 mb-3">
                    <div>
                        <div class="text-xs text-gray-400">劃撥資金至自營交易部:</div>
                        <p class="text-xs text-gray-400 mt-1">自營部資金獨立運作，牛市多單或熊市空單將以槓桿倍增金利潤！但一旦爆倉資金池歸零。</p>
                    </div>
                    <div class="flex gap-2 items-center justify-end">
                        <button onclick="CEO_FINANCE.transferPropCapital('${corp.id}', 10000000)" class="btn-retro text-xs py-1 px-3.5 border-cyan text-cyan font-bold">劃撥 +$10M</button>
                        <button onclick="CEO_FINANCE.transferPropCapital('${corp.id}', -10000000)" class="btn-retro text-xs py-1 px-3.5 border-yellow text-yellow font-bold">提回 -$10M</button>
                    </div>
                </div>
                
                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">交易多空方向:</label>
                        <select onchange="CEO_FINANCE.setPropDirection('${corp.id}', this.value)" class="bg-black border border-cyan text-cyan text-xs py-1 px-2 w-full outline-none cursor-pointer">
                            <option value="none" ${state.propDirection === 'none' ? 'selected' : ''}>💤 避險空倉閒置</option>
                            <option value="long" ${state.propDirection === 'long' ? 'selected' : ''}>📈 做多全球大盤</option>
                            <option value="short" ${state.propDirection === 'short' ? 'selected' : ''}>📉 做空全球大盤</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">期指槓桿倍數:</label>
                        <select onchange="CEO_FINANCE.setPropLeverage('${corp.id}', this.value)" class="bg-black border border-yellow text-yellow text-xs py-1 px-2 w-full outline-none cursor-pointer">
                            <option value="1" ${state.propLeverage == 1 ? 'selected' : ''}>1x (無槓桿)</option>
                            <option value="2" ${state.propLeverage == 2 ? 'selected' : ''}>2x 輕度擴張</option>
                            <option value="5" ${state.propLeverage == 5 ? 'selected' : ''}>5x 中度激進</option>
                            <option value="10" ${state.propLeverage == 10 ? 'selected' : ''}>10x 賭徒高爆</option>
                        </select>
                    </div>
                    <div class="text-xs text-gray-400 flex flex-col justify-end text-right">
                        <div>※ 10x 槓桿下，大盤下跌 10% 即可使整個自營資金池強制爆倉歸零！</div>
                    </div>
                </div>
            </div>`;
        }

        // C. IPO 承銷雷達
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">📡 企業 IPO / SEO 包銷承銷合約雷達</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.underwritingPipeline.length > 0) {
            state.underwritingPipeline.forEach(u => {
                let fee = u.targetCap * u.feeRate;
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2.5 last:border-0 text-gray-300">
                    <div>
                        <div class="text-cyan font-bold">${u.type} <span class="text-gray-400 text-xs ml-1">(${u.clientName})</span></div>
                        <div class="text-xs text-gray-400 mt-0.5">承銷總金額: $${app.formatMoney(u.targetCap)} | 預計手續費分成: +$${app.formatMoney(fee)}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-yellow font-mono font-bold animate-pulse">輔導上市中... 剩 ${u.daysLeft} 天</div>
                        ${!isReadOnly ? `
                            <button onclick="CEO_FINANCE.cancelUnderwrite('${corp.id}', '${u.id}')" class="btn-retro text-xs px-2 py-0.5 border-red-500 text-red-500 mt-1 font-bold">放棄包銷</button>
                        ` : ''}
                    </div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前沒有承作中的企業上市包銷案件。</div>`;
        }
        html += `</div>`;

        return html;
    },

    // ==========================================
    // 2-C. 保險與壽險 (insurance) 面板
    // ==========================================
    renderInsuranceUI(corp, isReadOnly) {
        const state = corp.financeState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-purple-400 font-bold mb-2 text-md">🛡️ 保險與壽險 (Insurance) 決策面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">依靠浮存金 (Float) 套利的巴菲特模式。CEO 可設定保單定價吸引龐大保費（無息資金池），再像基金經理人一樣決定浮存金配置（保守公債/平衡藍籌/激進科技股），但需警惕大地震巨災理賠黑天鵝！</p>`;

        // A. 浮存金配置狀況
        html += `<div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">保費浮存金總池 (Float)</div>
                <div class="text-purple-400 font-mono font-bold text-xs mt-1">$${app.formatMoney(state.floatPool)}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">保單價格指數</div>
                <div class="text-yellow-400 font-bold text-xs mt-1">${state.premiumPricing}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">最近一次巨災理賠紀錄</div>
                <div class="font-mono text-xs mt-1 ${state.lastCatastropheClaim > 0 ? 'text-red-500 font-bold animate-pulse' : 'text-gray-400'}">
                    ${state.lastCatastropheClaim > 0 ? `-$${app.formatMoney(state.lastCatastropheClaim)}` : '無近期巨災理賠'}
                </div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 保單定價調整
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">🏷️ 保單銷售定價指數 (Premium Pricing Control)</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] text-xs text-gray-300">
                <p class="text-xs text-gray-400 mb-3">定價定得越低（如 70% 便宜賣），保單吸引力暴增，每日保費流入浮存金速度狂飆，但一旦發生巨災理賠可能得不償失；定價定得高（如 130%）保費流入緩慢但利潤極厚。</p>
                <div class="flex gap-4 items-center">
                    <input type="range" min="60" max="140" step="5" value="${state.premiumPricing}"
                           onchange="CEO_FINANCE.changePremiumPricing('${corp.id}', this.value)"
                           class="w-2/3 cursor-pointer accent-purple-500">
                    <div class="text-xs font-mono">
                        <div>定價指數: <span class="text-yellow font-bold">${state.premiumPricing}%</span></div>
                        <div>吸保費強度: <span class="text-green-400 font-bold">${( (140 - state.premiumPricing) * 1.5 ).toFixed(0)}%</span></div>
                    </div>
                </div>
            </div>`;

            // C. 浮存金資產配置
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">⚖️ 浮存金投資資產配置 (Asset Allocation UI)</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] text-xs text-gray-300">
                <p class="text-xs text-gray-400 mb-3">設定浮存金的投資權重比。必須合計為 100%。保守買公債保本防黑天鵝；激進炒作股市追求暴利但易在大跌時面臨清算危機！</p>
                
                <div class="space-y-3.5">
                    <div class="flex justify-between items-center gap-3">
                        <span class="w-1/3">🛡️ 保守型 (政府公債 3% 息):</span>
                        <input type="range" min="0" max="100" step="5" value="${Math.floor(state.floatAllocation.conservative * 100)}"
                               onchange="CEO_FINANCE.changeFloatAllocation('${corp.id}', 'conservative', this.value)"
                               class="w-1/3 cursor-pointer accent-purple-500">
                        <span class="text-green-400 font-mono font-bold">${Math.floor(state.floatAllocation.conservative * 100)}%</span>
                    </div>
                    <div class="flex justify-between items-center gap-3">
                        <span class="w-1/3">⚖️ 平衡型 (藍籌股投資):</span>
                        <input type="range" min="0" max="100" step="5" value="${Math.floor(state.floatAllocation.balanced * 100)}"
                               onchange="CEO_FINANCE.changeFloatAllocation('${corp.id}', 'balanced', this.value)"
                               class="w-1/3 cursor-pointer accent-purple-500">
                        <span class="text-cyan font-mono font-bold">${Math.floor(state.floatAllocation.balanced * 100)}%</span>
                    </div>
                    <div class="flex justify-between items-center gap-3">
                        <span class="w-1/3">☠️ 激進型 (高風險股市自營):</span>
                        <input type="range" min="0" max="100" step="5" value="${Math.floor(state.floatAllocation.aggressive * 100)}"
                               onchange="CEO_FINANCE.changeFloatAllocation('${corp.id}', 'aggressive', this.value)"
                               class="w-1/3 cursor-pointer accent-purple-500">
                        <span class="text-red-400 font-mono font-bold">${Math.floor(state.floatAllocation.aggressive * 100)}%</span>
                    </div>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-D. 支付與特許融資 (payment) 面板
    // ==========================================
    renderPaymentUI(corp, isReadOnly) {
        const state = corp.financeState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-yellow font-bold mb-2 text-md">🚛 支付網絡與特許消費融資 (Payment & Leasing)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">輕資產抽成大王。CEO 可花錢進行異業推廣，快速擴張「會員發卡量」與「特約商店網」，形成強大的雙邊網絡抽成效應；亦可推動 12% 高息的「無卡分期 (BNPL) 租賃」信貸霸權！</p>`;

        // A. 網絡狀態與抽成營收
        let netFlow = state.activeUsers * state.partnerStores * 0.12 * (app.state.BCI !== undefined ? app.state.BCI/100 : 1.0);
        html += `<div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">會員持卡數 / 特約商店數</div>
                <div class="text-yellow-400 font-mono font-bold text-xs mt-1">${state.activeUsers.toLocaleString()} 人 / ${state.partnerStores.toLocaleString()} 家</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">網絡效應每日交易手續費</div>
                <div class="text-green-400 font-mono font-bold text-xs mt-1">+$${app.formatMoney(netFlow)} /日</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">BNPL 先買後付高利貸餘額</div>
                <div class="text-cyan font-mono font-bold text-xs mt-1">$${app.formatMoney(state.bnplBalance)}</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 網絡推廣
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow pl-1.5">📡 雙邊支付網絡推廣 (Network Expansion UI)</h4>`;
            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <button ${disabledAttr} onclick="CEO_FINANCE.expandPaymentNetwork('${corp.id}', 'users')" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-yellow border-opacity-40 text-left transition hover:border-yellow">
                    <div class="font-bold text-yellow text-xs">📣 投放消費者返利廣告 (-$8M)</div>
                    <div class="text-xs text-gray-400 mt-1">增開新卡，提升會員卡數規模。</div>
                    <div class="text-green-400 font-bold text-xs mt-1.5">預計發卡會員: +3,000人</div>
                </button>
                <button ${disabledAttr} onclick="CEO_FINANCE.expandPaymentNetwork('${corp.id}', 'stores')" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-yellow border-opacity-40 text-left transition hover:border-yellow">
                    <div class="font-bold text-yellow text-xs">🤝 簽約中大型特約商家連鎖 (-$15M)</div>
                    <div class="text-xs text-gray-400 mt-1">擴大特約通路覆蓋，倍增交易次數。</div>
                    <div class="text-green-400 font-bold text-xs mt-1.5">預計特約商家: +150家</div>
                </button>
            </div>`;

            // C. BNPL 高利貸業務投放
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow pl-1.5">💸 無卡分期先買後付高利貸立項 (BNPL Financing Projects)</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            let bnplCost = isFirstYearSubsidized ? 24000000 : 30000000;

            html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] flex justify-between items-center">
                <div>
                    <div class="font-bold text-cyan">投放次世代 [無卡分期 BNPL 融資池]</div>
                    <div class="text-xs text-gray-400 mt-0.5">釋放消費信貸額度給中小企業與學生。年化利率高達 12%，但與 retail 景氣高度掛鉤。</div>
                </div>
                <button onclick="CEO_FINANCE.launchBnplPool('${corp.id}')" class="btn-retro text-xs border-cyan text-cyan font-bold py-1.5 px-4 hover:bg-cyan-950 transition">
                    投放放貸金 -$${app.formatMoney(bnplCost)}
                </button>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 3. 玩家操作互動 (Actions)
    // ==========================================
    
    // A. 調整商業銀行存款/放款利率 (changeRates)
    changeRates(corpId, type, val) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.financeState) return;

        let numVal = parseFloat(val) / 100;
        if (type === 'deposit') {
            corp.financeState.depositRate = numVal;
            app.log(`【利率微操】${corp.name} 存款利率調整至: ${(numVal*100).toFixed(2)}%。這會動態調整吸儲速度與每月利息支出！`, "text-yellow");
        } else {
            corp.financeState.lendingRate = numVal;
            app.log(`【利率微操】${corp.name} 放款利率調整至: ${(numVal*100).toFixed(2)}%。這會影響新客戶貸款意願與息收毛利！`, "text-yellow");
        }
        this.refreshFinanceTabUI(corp);
    },

    // B. 調整商業銀行 LTV 寬鬆度 (changeLTV)
    changeLTV(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.financeState) return;

        let threshold = parseFloat(value) / 100;
        corp.financeState.ltvThreshold = threshold;
        app.log(`【授信微操】商業銀行 ${corp.name} 將放款信用 LTV 門檻調整至: ${value}%。LTV 越高放貸阻力越小，利息營收將倍增，但壞帳與擠兌風險也同步飆升！`, "text-yellow");
        this.refreshFinanceTabUI(corp);
    },

    // C. 商業銀行擠兌緊急救市 (injectRescueCapital)
    injectRescueCapital(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.financeState) return;

        const state = corp.financeState;
        if (state.bankRunDaysLeft <= 0) return;

        const cost = 30000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost;
            state.bankRunDaysLeft = 0;
            app.log(`【救市注資成功】🛡️ ${corp.name} 金控撥付救市資金 $30,000,000 緊急準備準備金，平息了恐慌情緒，擠兌風暴正式解除！`, "text-green-400 font-bold animate-pulse");
            this.refreshFinanceTabUI(corp);
        } else {
            app.log("【流動性不足】金控現金不足，無法支付 $30M 救市準備金！請速變賣股債或宣告上市籌資！", "text-red-500 font-bold");
        }
    },

    // D. 投行劃撥資金至自營部交易池 (transferPropCapital)
    transferPropCapital(corpId, amount) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.financeState) return;

        const state = corp.financeState;
        if (amount > 0) {
            // 劃撥至自營
            if (corp.corporateCash >= amount) {
                corp.corporateCash -= amount;
                state.propTradingPool = (state.propTradingPool || 0) + amount;
                app.log(`【自營部劃撥】${corp.name} 從金控現金中劃撥 $${app.formatMoney(amount)} 至自營交易部！`, "text-cyan");
            } else {
                app.log("【資金不足】金控現金餘額不足！", "text-red-500");
            }
        } else {
            // 提回金控
            let withdraw = Math.abs(amount);
            if (state.propTradingPool >= withdraw) {
                state.propTradingPool -= withdraw;
                corp.corporateCash = (corp.corporateCash || 0) + withdraw;
                app.log(`【自營部提回】${corp.name} 自自營交易池提回 $${app.formatMoney(withdraw)} 至金控總部！`, "text-yellow");
            } else {
                app.log("【提回失敗】自營交易池中無足夠的現金！", "text-red-500");
            }
        }
        this.refreshFinanceTabUI(corp);
    },

    // E. 設定投行自營部多空方向 (setPropDirection)
    setPropDirection(corpId, dir) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.financeState) return;

        corp.financeState.propDirection = dir;
        const dirNames = {
            none: '💤 避險空倉閒置',
            long: '📈 做多全球大盤',
            short: '📉 做空全球大盤'
        };
        app.log(`【自營部轉向】${corp.name} 自營部今日起轉向為 [${dirNames[dir]}]，每日損益隨大盤指數起伏！`, "text-cyan font-bold");
        this.refreshFinanceTabUI(corp);
    },

    // F. 設定投行自營部槓桿倍數 (setPropLeverage)
    setPropLeverage(corpId, lev) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.financeState) return;

        corp.financeState.propLeverage = parseInt(lev);
        app.log(`【槓桿變更】${corp.name} 自營交易部將期貨槓桿調整至: ${lev}x 倍！這極大化放大了損益彈性，但也極大化放大了爆倉風險。`, "text-yellow font-bold");
        this.refreshFinanceTabUI(corp);
    },

    // G. 放棄投行承銷合約 (cancelUnderwrite)
    cancelUnderwrite(corpId, uid) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.financeState) return;

        const state = corp.financeState;
        const uIdx = state.underwritingPipeline.findIndex(x => x.id === uid);
        if (uIdx === -1) return;

        if (!confirm("【警告】確定要強行中止該企業上市輔導承銷案嗎？這會被證監會處以 $5,000,000 違約罰金！")) {
            return;
        }

        corp.corporateCash = Math.max(0, corp.corporateCash - 5000000);
        corp.monthExpense = (corp.monthExpense || 0) + 5000000;
        state.underwritingPipeline.splice(uIdx, 1);
        app.log(`【中止承銷】${corp.name} 中止了企業上市案，支付了 $5M 懲罰性違約金。`, "text-red-500");
        this.refreshFinanceTabUI(corp);
    },

    // H. 調整保單定價 (changePremiumPricing)
    changePremiumPricing(corpId, val) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.financeState) return;

        corp.financeState.premiumPricing = parseInt(val);
        app.log(`【保單定價調整】壽險公司 ${corp.name} 將保單銷售定價指數設定為: ${val}%。這會影響每日保費浮存金流入的強度！`, "text-purple-400");
        this.refreshFinanceTabUI(corp);
    },

    // I. 調整浮存金資產配置比例 (changeFloatAllocation)
    changeFloatAllocation(corpId, assetType, val) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.financeState) return;

        const state = corp.financeState;
        let percent = parseFloat(val) / 100;
        
        // 保證三項配置之和等於 100% 的動態微調邏輯
        let otherTypes = Object.keys(state.floatAllocation).filter(x => x !== assetType);
        state.floatAllocation[assetType] = percent;
        
        let remaining = 1.0 - percent;
        if (remaining < 0) {
            state.floatAllocation[assetType] = 1.0;
            state.floatAllocation[otherTypes[0]] = 0;
            state.floatAllocation[otherTypes[1]] = 0;
        } else {
            // 平分剩餘比例
            state.floatAllocation[otherTypes[0]] = remaining / 2;
            state.floatAllocation[otherTypes[1]] = remaining / 2;
        }
        
        app.log(`【資產配置變更】${corp.name} 調整浮存金分配比例：保守公債 ${Math.floor(state.floatAllocation.conservative*100)}% | 平衡藍籌 ${Math.floor(state.floatAllocation.balanced*100)}% | 激進自營 ${Math.floor(state.floatAllocation.aggressive*100)}%！`, "text-purple-300 font-bold");
        this.refreshFinanceTabUI(corp);
    },

    // J. 支付融資網路推廣 (expandPaymentNetwork)
    expandPaymentNetwork(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.financeState) return;

        const state = corp.financeState;
        let price = type === 'users' ? 8000000 : 15000000;

        if (corp.corporateCash >= price) {
            corp.corporateCash -= price;
            corp.monthExpense = (corp.monthExpense || 0) + price;
            if (type === 'users') {
                state.activeUsers += 3000;
                app.log(`【發卡推廣大成功】${corp.name} 投放 $8,000,000 信用卡返利廣告，新增了 3,000 名活躍發卡持卡會員！`, "text-green-400");
            } else {
                state.partnerStores += 150;
                app.log(`【商店網絡擴張】${corp.name} 投放 $15,000,000 特約商店連鎖整合行銷，簽約新增了 150 家大中型零售特約商戶！`, "text-green-400");
            }
            this.refreshFinanceTabUI(corp);
        } else {
            app.log(`【資金不足】網路推展需要 $${app.formatMoney(price)} 現金！`, "text-red-500");
        }
    },

    // K. 特許融資先買後付投放 (launchBnplPool)
    launchBnplPool(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.financeState) return;

        const state = corp.financeState;
        const cost = 30000000;

        // 第一年減免 20%
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            state.bnplBalance = (state.bnplBalance || 0) + cost;
            let subsidyMsg = isFirstYearSubsidized ? ` (享金管會融資立項補貼 20% 減免)` : '';
            app.log(`【融資池投放】${corp.name} 斥資 $${app.formatMoney(finalCost)}${subsidyMsg} 成功投放全新無卡分期 (BNPL) 資金池！每日特許信貸高回報息收滾動中！`, "text-cyan font-bold");
            this.refreshFinanceTabUI(corp);
        } else {
            app.log(`【資金不足】BNPL 融資池投放需要 $${app.formatMoney(finalCost)} 現金。`, "text-red-500");
        }
    },

    // ==========================================
    // 4. 每日營收與壞帳、自營、理賠結算 (Process Revenue)
    // ==========================================
    processRevenue(corp) {
        if (!corp.financeState) {
            this.initAssets(corp);
        }
        const state = corp.financeState;
        
        // 【全方位防禦性安全性保護】防範任何 undefined 或 NaN 造成的數學運算崩潰與 NaN 污染
        state.depositBalance = Number(state.depositBalance) || 0;
        state.lendingBalance = Number(state.lendingBalance) || 0;
        state.depositRate = Number(state.depositRate) || 0.015;
        state.lendingRate = Number(state.lendingRate) || 0.050;
        state.ltvThreshold = Number(state.ltvThreshold) || 0.70;
        state.defaultRate = Number(state.defaultRate) || 0.01;
        state.bankRunDaysLeft = Number(state.bankRunDaysLeft) || 0;

        state.propTradingPool = Number(state.propTradingPool) || 0;
        state.propDirection = state.propDirection || 'none';
        state.propLeverage = Number(state.propLeverage) || 1;
        state.underwritingPipeline = state.underwritingPipeline || [];

        state.floatPool = Number(state.floatPool) || 0;
        state.premiumPricing = Number(state.premiumPricing) || 100;
        state.floatAllocation = state.floatAllocation || { conservative: 0.50, balanced: 0.40, aggressive: 0.10 };
        state.floatAllocation.conservative = Number(state.floatAllocation.conservative) || 0;
        state.floatAllocation.balanced = Number(state.floatAllocation.balanced) || 0;
        state.floatAllocation.aggressive = Number(state.floatAllocation.aggressive) || 0;

        state.activeUsers = Number(state.activeUsers) || 0;
        state.partnerStores = Number(state.partnerStores) || 0;
        state.bnplBalance = Number(state.bnplBalance) || 0;
        state.bnplInterestRate = Number(state.bnplInterestRate) || 0.12;

        let daysOldForSub = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOldForSub <= 90) || (corp.isListed && ipoDaysOld <= 90);

        let dailyRev = 0;
        let dailyExp = 0;
        let bcf = app.state.BCI !== undefined ? app.state.BCI : 100; // 利用 BCI 當作金融週期熱度
        
        // --- 商業銀行 (commercial) ---
        if (corp.bizModel === 'commercial') {
            // 基礎行政與金流網點維護費
            dailyExp += 25000;

            // LTV 信評引起呆帳率與壞帳計算
            // 基礎壞帳率: LTV 越高呆帳率越高
            let baseDefault = state.ltvThreshold >= 0.85 ? 0.08 : (state.ltvThreshold >= 0.65 ? 0.02 : 0.005);
            
            // 總經對呆帳的乘數連動：熊市 2 倍，基準利率越高呆帳越高
            let rateMult = Math.max(1.0, (app.state.baseRate - 0.02) * 20);
            let stateMult = app.state.marketState === 'bear' ? 2.5 : 1.0;
            
            // 房價崩盤（地產 links 生死相依連動）：
            // 若 realestate 房地產板塊大跌，銀行的壞帳率加成 300% (3倍)
            let reSect = app.state.stocks.filter(x => x.sector === 'realestate');
            let isReCrashing = reSect.length > 0 && reSect.every(x => x.price < x.basePrice * 0.85);
            let crashMult = isReCrashing ? 3.0 : 1.0;

            state.defaultRate = Math.min(0.40, baseDefault * rateMult * stateMult * crashMult);

            // 結算利息營收 (總放貸 * 放貸率 / 365)
            let lendingRev = (state.lendingBalance * state.lendingRate) / 365;
            dailyRev += lendingRev;

            // 結算存款利息支出 (總存款 * 存款率 / 365)
            let depositExp = (state.depositBalance * state.depositRate) / 365;
            dailyExp += depositExp;

            // 結算每日信用呆帳損失 (總放貸 * 呆帳率 / 365)
            let defaultExp = (state.lendingBalance * state.defaultRate) / 365;
            dailyExp += defaultExp;

            // 存放貸與吸儲動態調整 (受存款利率及大環境影響)
            // 存款流動: 存款利率大於基準利率，存款暴增
            let depDrift = (state.depositRate - app.state.baseRate) * state.depositBalance * 0.02;
            state.depositBalance = Math.max(10000000, state.depositBalance + depDrift);

            // 貸出流動: 放貸率越低、LTV越高、放貸餘額越大
            let lenDrift = (state.ltvThreshold - 0.5) * 0.01 * state.depositBalance - (state.lendingRate - 0.03) * 0.05 * state.lendingBalance;
            state.lendingBalance = Math.min(state.depositBalance * 0.95, Math.max(5000000, state.lendingBalance + lenDrift));

            // 雙軌政策保護：上市或自創前三個月存款返息減免補貼
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += 25000;
            }

            // 壞帳核銷日誌
            if (corp.isPlayerFounded && defaultExp > 50000 && Math.random() < 0.05) {
                app.log(`【呆帳損失】⚠️ 商業銀行 ${corp.name} 申報一筆受 LTV 影響的不良抵押債權壞帳！核銷壞帳損失 -$${app.formatMoney(defaultExp * 30)} (折月損益)！`, "text-red-500");
            }

            // 流動性過低觸發擠兌危機
            if (corp.isPlayerFounded && corp.corporateCash < state.depositBalance * 0.10 && state.bankRunDaysLeft === 0 && Math.random() < 0.02) {
                state.bankRunDaysLeft = 5; // 5天內必須救市
                corp.price = Math.max(0.1, corp.price * 0.5); // 股價減半
                app.log(`【🚨 散戶恐慌擠兌暴發】極端流動性危機！${corp.name} 的金控流動現金跌破存款客戶總餘額之 10% 警戒線！市場恐慌蔓延，爆發散戶瘋狂擠兌！5 天內若不注入緊急融資存款金 ($30M)，銀行將宣告破產倒閉！`, "text-red-500 font-bold animate-pulse");
            }
        }
        
        // --- 投資銀行與資管 (investment) ---
        else if (corp.bizModel === 'investment') {
            // 基礎行政與研究團隊薪資
            dailyExp += 35000;

            // A. 自營大盤做多做空期指每日結算 (Long / Short Leverage Prop)
            if (state.propTradingPool > 0 && state.propDirection !== 'none') {
                let indexLast = app.state.marketIndexLast || 21500;
                let indexCurrent = app.state.marketIndex || 21500;
                let marketReturn = (indexCurrent - indexLast) / indexLast; // 每日大盤回報

                let propReturn = marketReturn * state.propLeverage;
                if (state.propDirection === 'short') propReturn = -propReturn; // 空單反向

                let propDelta = state.propTradingPool * propReturn;
                state.propTradingPool = Math.max(0, state.propTradingPool + propDelta);

                if (propDelta > 0) {
                    dailyRev += propDelta;
                    if (corp.isPlayerFounded && propDelta > 5000000 && Math.random() < 0.05) {
                        app.log(`【自營部大捷】📈 ${corp.name} 自營部精準以 ${state.propLeverage}x 槓桿 ${state.propDirection === 'long' ? '做多' : '做空'} 大盤！今日大盤回報 ${(marketReturn*100).toFixed(2)}%，自營部大賺並向金控認列 +$${app.formatMoney(propDelta)}！`, "text-green-400 font-bold animate-pulse");
                    }
                } else {
                    dailyExp += Math.abs(propDelta);
                    // 爆倉判定
                    if (state.propTradingPool <= 0) {
                        state.propDirection = 'none';
                        app.log(`【💥 自營交易強制爆倉】驚天噩耗！${corp.name} 自營部高槓桿期貨交易池因今日全球金融大盤劇烈反向波動，保證金不足宣告「強制爆倉」！自營池資金全數歸零！自營部強行退場避險！`, "text-red-500 font-bold animate-pulse");
                    }
                }
            }

            // B. 消化輔導企業上市的包銷 Backlog 合約 (Underwriting)
            for (let i = state.underwritingPipeline.length - 1; i >= 0; i--) {
                let u = state.underwritingPipeline[i];
                u.daysLeft--;
                if (u.daysLeft <= 0) {
                    // 交割手續費與包銷成敗判定 (大盤好手續費加倍，大盤極差破發要自己吞)
                    let feeRate = u.feeRate;
                    let cap = u.targetCap;
                    
                    if (app.state.marketState === 'bull') {
                        // 順利溢價上市
                        let successFee = cap * (feeRate + 0.02);
                        dailyRev += successFee;
                        app.log(`【投行承銷交割】🏆 狂賀！${corp.name} 順利輔導 [${u.clientName}] 完成重磅溢價 IPO 上市承銷！獲取高額包銷手續費 +$${app.formatMoney(successFee)}！`, "text-green-400 font-bold");
                    } else if (app.state.marketState === 'bear') {
                        // 破發，投行被迫流血吞下爛股票 (虧損 15%)
                        let breakCost = cap * 0.15;
                        dailyExp += breakCost;
                        app.log(`【💥 投行包銷破發】噩耗！${corp.name} 輔導承銷之 [${u.clientName}] 於蕭條熊市下上市即刻破發跌停！由於包銷協議，投行被迫流血吞下剩餘發行籌碼，折損虧損 -$${app.formatMoney(breakCost)}！`, "text-red-500 font-bold");
                    } else {
                        // 常規上市
                        let successFee = cap * feeRate;
                        dailyRev += successFee;
                        app.log(`【投行承銷交割】${corp.name} 順利完成 [${u.clientName}] IPO 承銷上市輔導，認列合約手續費 +$${app.formatMoney(successFee)}。`, "text-cyan");
                    }
                    state.underwritingPipeline.splice(i, 1);
                }
            }

            // 雙軌政策保護：上市或自創前三個月營運與顧問人事減免補貼
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
            }

            // D. 每日 0.5% (極低機率) 隨機生成新的 IPO 承銷委託 backlog (背景被動)
            if (corp.isPlayerFounded && Math.random() < 0.005) {
                this.triggerNewUnderwritingBid(corp);
            }
        }
        
        // --- 保險與壽險 (insurance) ---
        else if (corp.bizModel === 'insurance') {
            // 基礎行政與理賠精算師薪工
            dailyExp += 20000;

            // A. 保費無息資金流流入 (浮存金 Float Pool 增長)
            // 定價越便宜(premiumPricing越低)，流入越多
            let inflowSpeed = (140 - state.premiumPricing) * 450 * (bcf / 100);
            state.floatPool += inflowSpeed;
            dailyRev += inflowSpeed * 0.10; // 保險純利潤分成

            // B. 浮存金配置投資收益結算 (Float Asset Allocation NIM)
            let consPool = state.floatPool * state.floatAllocation.conservative;
            let balPool = state.floatPool * state.floatAllocation.balanced;
            let aggPool = state.floatPool * state.floatAllocation.aggressive;

            // 1. 保守公債年化收益 3% (3% / 365 = 每日約 0.00008)
            let consGain = consPool * (0.03 / 365);
            dailyRev += consGain;

            // 2. 平衡藍籌股收益：隨全球大盤波動 (大盤回報 * 配置資金)
            let indexLast = app.state.marketIndexLast || 21500;
            let indexCurrent = app.state.marketIndex || 21500;
            let marketReturn = (indexCurrent - indexLast) / indexLast;
            let balGain = balPool * marketReturn;
            
            if (balGain > 0) dailyRev += balGain;
            else dailyExp += Math.abs(balGain);
            // 動態同步浮存金池
            state.floatPool = Math.max(1000000, state.floatPool + balGain);

            // 3. 激進股市自營：高震盪，收益隨大盤波動 * 3x 槓桿
            let aggGain = aggPool * marketReturn * 3.0;
            if (aggGain > 0) dailyRev += aggGain;
            else dailyExp += Math.abs(aggGain);
            state.floatPool = Math.max(100000, state.floatPool + aggGain);

            // 雙軌政策保護：上市或自創前三個月日常營運與理賠維持費減免
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
            }

            // D. 每日 0.1% 極低機率觸發「巨災理賠黑天鵝事件」 (Catastrophe Crisis)
            if (corp.isPlayerFounded && Math.random() < 0.001) {
                this.triggerCatastrophePayout(corp);
            }
        }
        
        // --- 支付與特許融資 (payment) ---
        else if (corp.bizModel === 'payment') {
            // 網路清算數據中心與發卡人事費
            dailyExp += 15000;

            // A. 網路效應刷卡交易流水清算抽成營收 (NIM)
            // 網絡效應 = 會員數 * 商店數 * 0.12 * 週期熱度
            let passiveFlow = state.activeUsers * state.partnerStores * 0.12 * (bcf / 100);
            dailyRev += passiveFlow;

            // B. 結算 BNPL 先買後付高利貸高利息收入 (總餘額 * 12% / 365)
            let bnplRev = (state.bnplBalance * state.bnplInterestRate) / 365;
            dailyRev += bnplRev;

            // C. 結算 BNPL 呆帳扣減
            // 呆帳率與零售景氣成反比 (BCI 熱度越低，老百姓還不出高利貸)
            let retailBcf = bcf;
            let bnplDefaultRate = Math.max(0.01, (160 - retailBcf) / 100 * 0.06); 
            let bnplDefaultCost = (state.bnplBalance * bnplDefaultRate) / 365;
            dailyExp += bnplDefaultCost;

            // BNPL 額度收回折舊與流動
            state.bnplBalance = Math.max(0, state.bnplBalance - (state.bnplBalance * 0.005) + (window.netPlayBnplAmt || 0));

            // 雙軌政策保護：上市或自創前三個月營運費用減半，且國家特許每日補貼交易息金 $20,000！
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += 20000;
            }

            // 清理暫存
            window.netPlayBnplAmt = 0;

            // 隨機日誌提示
            if (corp.isPlayerFounded && bnplDefaultCost > 80000 && Math.random() < 0.05) {
                app.log(`【BNPL呆帳】⚠️ 支付公司 ${corp.name} 提撥了一筆無卡分期 (BNPL) 消費信貸倒債呆帳！呆帳核銷 -$${app.formatMoney(bnplDefaultCost * 30)} (折月損益)！`, "text-red-500");
            }
        }

        // 安全性限幅與 NaN 全域防禦
        if (isNaN(dailyRev) || dailyRev === undefined || dailyRev < 0) dailyRev = 0;
        if (isNaN(dailyExp) || dailyExp === undefined || dailyExp < 0) dailyExp = 0;

        // 全域現金更新與月報表計入
        corp.corporateCash = (corp.corporateCash || 0) + dailyRev - dailyExp;
        if (corp.corporateCash < 0) corp.corporateCash = 0;
        corp.monthRevenue = (corp.monthRevenue || 0) + dailyRev;
        corp.monthExpense = (corp.monthExpense || 0) + dailyExp;
        corp.lastDailyRev = dailyRev;
        corp.lastDailyExp = dailyExp;
    },

    // ==========================================
    // 5. 突發監管危機與政策事件觸發 (Inspection / Payouts)
    // ==========================================
    
    // A. 投行承銷：隨機觸發新的企業 IPO 包銷機會
    triggerNewUnderwritingBid(corp) {
        const state = corp.financeState;
        
        // 隨機公司名稱
        const clients = ['世創精密', '達邁科技', '啟碁網通', '大江保健', '信驊半導體', '緯穎伺服器'];
        let client = clients[Math.floor(Math.random() * clients.length)];
        let target = 50000000 + Math.random() * 80000000;
        
        state.underwritingPipeline.push({
            id: `U-${Date.now()}`,
            clientName: client,
            type: 'IPO新股上市包銷',
            targetCap: target,
            feeRate: 0.03 + Math.random() * 0.02,
            daysLeft: 15
        });

        app.log(`【承銷商雷達】📡 投資銀行 ${corp.name} 爭取到一筆 [${client}] 委託之全球新股 IPO 上市包銷案！目標上市募資額 $${app.formatMoney(target)}，預計手續費率 4%，承銷輔導啟動！`, "text-cyan font-bold");
        this.refreshFinanceTabUI(corp);
    },

    // B. 壽險公司：突發巨災理賠黑天鵝事件
    triggerCatastrophePayout(corp) {
        const state = corp.financeState;
        
        // 理賠金額
        let claims = 100000000 + Math.random() * 200000000;
        state.lastCatastropheClaim = claims;

        // 理賠對金控的重擊：直接扣除現金
        if (corp.corporateCash >= claims) {
            corp.corporateCash -= claims;
            corp.monthExpense = (corp.monthExpense || 0) + claims;
            app.log(`【🚨 巨災地理賠黑天鵝爆發】極端巨災危機！全球氣候極端引發大地震與海嘯，壽險公司 ${corp.name} 面臨大規模保單出險，強制清算理賠保費損失 -$${app.formatMoney(claims)}！`, "text-red-500 font-bold animate-pulse");
        } else {
            // 現金不足，被迫賤賣浮存金資產，浮存金遭受折損 (高達 30% 割肉損失)
            let remain = claims - corp.corporateCash;
            corp.monthExpense = (corp.monthExpense || 0) + corp.corporateCash;
            corp.corporateCash = 0;
            
            let sellLoss = remain * 1.30;
            state.floatPool = Math.max(100000, state.floatPool - sellLoss);
            
            corp.price = Math.max(0.1, corp.price * 0.6); // 股價大跌 40%
            app.log(`【☠️ 壽險金控流動性危機】極度慘烈！壽險公司 ${corp.name} 面臨巨災理賠 $${app.formatMoney(claims)}，但金控帳上流動現金严重不足！被迫流血割肉「賤賣浮存金股債」資產，浮存金折損 -$${app.formatMoney(sellLoss)}！公司股價面臨連續大跌跌停！`, "text-red-500 font-bold animate-pulse");
        }

        this.refreshFinanceTabUI(corp);
    },

    // ==========================================
    // 6. UI 重新整理防護 (Refresh & Cash Update)
    // ==========================================
    refreshFinanceTabUI(corp) {
        const contentArea = document.getElementById('ops-tab-content');
        if (contentArea) {
            this.renderFinanceTab(corp, contentArea, false);
        }
        
        // 雙重防護：操作後即時更新公司頂部現金顯示，解決自創公司現金未刷新的顯示 Bug
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl && typeof app !== 'undefined') {
            cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        }

        if (typeof app !== 'undefined' && app.updateUI) {
            app.updateUI();
        }
    }
};

window.CEO_FINANCE = CEO_FINANCE;
