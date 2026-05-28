// ceo_telecom.js - 通信與網路產業 (Telecom & Network) 核心模擬子系統
const CEO_TELECOM = {
    // ==========================================
    // 1. 初始化資產 (Init Assets)
    // ==========================================
    initAssets(corp) {
        // [新增防禦性修復] 若 corp.bizModel 缺失，自動根據常見通信 ID 進行指派 (防範老舊讀檔空白問題)
        if (!corp.bizModel) {
            if (corp.id === '9432') {
                corp.bizModel = 'idc_cloud';
            } else if (corp.id === '9984') {
                corp.bizModel = 'tech_holding';
            } else {
                // 其餘 2412, 3045, 4904, T, VZ, TMUS 預設為 MNO 模式
                corp.bizModel = 'mno';
            }
        }

        if (!corp.telecomState) {
            corp.telecomState = {
                // 通用電信狀態
                infraScore: 100,            // 基建覆蓋率指數 (0% ~ 200%)
                marketReputation: 100,      // 市場聲譽 (0 ~ 100)
                techDebt: 0,                // 技術債百分比 (0% ~ 100%)
                isSuspended: false,         // 是否因資安漏洞遭國家斷網重整
                regulationDaysLeft: 0,      // 資安整改剩餘天數
                
                // MNO 基礎電信營運商 (mno)
                subscribers: 100000,        // 活躍用戶數
                arpu: 500,                  // 每戶平均收入 (ARPU) 元/月
                churnRate: 0.04,            // 月度流失率 (4%)
                g6Countdown: -1,            // 6G 頻譜競標倒數 (-1 表示尚未確立)
                has6GLicense: false,        // 是否取得 6G 執照
                g6Progress: 0,              // 6G 基地台覆蓋進度 (0% ~ 100%)
                isPriceWarActive: false,    // 是否正在經歷割喉價格戰
                
                // MVNO 虛擬電信商 (mvno)
                mvnoSubscribers: 10000,     // MVNO 活躍用戶
                leaseCostPerGb: 5,          // 頻寬租賃批發單價 (元/GB)
                mvnoArpu: 299,              // 便宜大碗 ARPU
                mvnoChurn: 0.07,            // 價格敏感流失率 (7%)
                leaseCapacity: 30000,       // 向 MNO 租賃之總流量頻寬容量 (GB/月)
                
                // 固網與資料中心 (idc_cloud)
                serverRacks: 30,            // 已建置機櫃數量 (組)
                activeContracts: [],        // 企業級長約 (B2B): { id, clientName, racksNeeded, dailyFee, monthsLeft }
                powerUsageEfficiency: 1.6,  // PUE 電能利用效率 (1.65 ~ 1.1)
                rackMaintDaily: 350,        // 每個機櫃每日電力與折舊成本
                idcPipeline: [],            // 客戶租賃招標案 pipeline
                
                // 電信投資控股 (tech_holding)
                holdingCashPool: 0,         // 本業盈餘吸血池
                investments: [],            // 創投雷達持有投資項目: { id, name, type, stage, investedAmount, valMultiplier, risk, progress }
                vcRadar: []                 // 待投資之隨機新創雷達項目
            };
        }

        const state = corp.telecomState;
        const p = corp.price || corp.basePrice || 100;
        const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;

        // 玩家創立之公司初始資源 (輕量創業扶持)
        if (corp.isPlayerFounded) {
            if (corp.bizModel === 'mno') {
                state.subscribers = 50000;
                state.arpu = 499;
                state.infraScore = 110;
            } else if (corp.bizModel === 'mvno') {
                state.mvnoSubscribers = 15000;
                state.mvnoArpu = 299;
                state.leaseCapacity = 50000;
            } else if (corp.bizModel === 'idc_cloud') {
                state.serverRacks = 25;
                state.powerUsageEfficiency = 1.55;
                // 玩家創立之資料中心公司開局無任何長約，實現真正的白手起家
            } else if (corp.bizModel === 'tech_holding') {
                state.holdingCashPool = 10000000; // 給予一千萬初始願景創投基金
                state.subscribers = 8000;         // 本業底層電信基數
                state.arpu = 350;
            }
            return;
        }

        // ==========================================
        // 非玩家（上市公司）根據規模給予初始航線與資源
        // ==========================================
        
        // A. 基礎電信營運商 (mno)
        if (corp.bizModel === 'mno') {
            if (corp.id === '2412') { // 中華電
                state.subscribers = scale * 800000 + 4000000;
                state.arpu = 580;
                state.infraScore = 145;
            } else if (corp.id === 'T' || corp.id === 'VZ') { // AT&T, Verizon (海外巨頭)
                state.subscribers = scale * 3000000 + 12000000;
                state.arpu = 1200;
                state.infraScore = 135;
            } else {
                state.subscribers = scale * 400000 + 1000000;
                state.arpu = 499;
                state.infraScore = 115;
            }
        }
        
        // B. 虛擬電信商 (mvno)
        else if (corp.bizModel === 'mvno') {
            state.mvnoSubscribers = scale * 100000 + 50000;
            state.mvnoArpu = 249;
            state.leaseCapacity = state.mvnoSubscribers * 1.6;
        }
        
        // C. 固網與資料中心 (idc_cloud)
        else if (corp.bizModel === 'idc_cloud') {
            if (corp.id === '9432') { // NTT (固網大哥)
                state.serverRacks = scale * 300 + 1500;
                state.powerUsageEfficiency = 1.3;
            } else {
                state.serverRacks = scale * 50 + 200;
                state.powerUsageEfficiency = 1.5;
            }
            // 隨機注入長約
            let racksUsed = Math.floor(state.serverRacks * 0.6);
            state.activeContracts.push({
                id: `B2B-L-${corp.id}`,
                clientName: '聯發科 AI 研發中心',
                racksNeeded: racksUsed,
                dailyFee: 1100,
                monthsLeft: 18
            });
        }
        
        // D. 電信投資控股 (tech_holding)
        else if (corp.bizModel === 'tech_holding') {
            if (corp.id === '9984') { // 軟銀 (SoftBank)
                state.subscribers = 5000000; // 本業穩定但零增長
                state.arpu = 600;
                state.holdingCashPool = scale * 50000000 + 200000000;
                // 注入初始投資項目 (高估值前沿科技)
                state.investments.push({
                    id: `VC-INIT-1`,
                    name: 'ARM 核心晶片架構研發',
                    type: '晶片設計',
                    stage: 'A輪',
                    investedAmount: 80000000,
                    valMultiplier: 2.5,
                    risk: 0.15,
                    progress: 45
                });
            } else {
                state.subscribers = 1000000;
                state.arpu = 450;
                state.holdingCashPool = scale * 10000000 + 20000000;
            }
        }
    },

    // ==========================================
    // 2. UI 渲染派發 (Render)
    // ==========================================
    renderTelecomTab(corp, contentArea, isReadOnly) {
        if (!corp.telecomState) this.initAssets(corp);
        let html = `<div class="p-4 bg-black border border-gray-800 rounded crt">`;
        
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        
        // 頂部全域科技扶持法案橫幅 (Startup Shield Plan)
        if (isFirstYearSubsidized) {
            html += `<div class="mb-4 text-xs bg-cyan-950 bg-opacity-35 p-3 rounded border border-cyan-700 text-cyan-400 flex flex-col gap-1 shadow-[0_0_15px_rgba(0,255,255,0.15)] animate-pulse">
                <div class="font-bold flex items-center gap-1.5">🟢 國家數位通訊特許護航法案生效中 (創立/上市前三個月)</div>
                <div class="text-xs text-gray-300">※ 享有：每日基地台/機房維護、電力與行政折舊支出減免 50% 政策貼補。</div>
                <div class="text-xs text-gray-300">※ 享有：基地台擴建、頻寬租用、機櫃擴建等手動 CapEx 支出享 20% 財政減免。</div>
                <div class="text-xs text-yellow-500 font-bold">※ 特許特權：已自動掛載「國家偏鄉數位機會建設」專案，每日保證獲得淨收益 +$25,000！</div>
            </div>`;
        }

        // 處於資安調查警告
        if (corp.telecomState.isSuspended) {
            html += `<div class="mb-4 text-xs bg-red-950 bg-opacity-40 p-3 rounded border border-red-500 text-red-500 flex flex-col gap-1 shadow-[0_0_15px_rgba(255,0,0,0.2)] animate-pulse">
                <div class="font-bold flex items-center gap-1.5">🚨 國家 NCC 重罰斷網整頓中 (NETWORK SUSPENDED BY GOVERNMENT)</div>
                <div class="text-xs text-gray-300">※ 警告：公司涉嫌爆發重大用戶個資外洩或網路安全防護缺失，遭主管機關勒令強制斷網，每日營收已強行清零！</div>
                <div class="text-xs text-gray-300">※ 處理：必須點擊下方「緊急合規處理」支付防護預算清償技術債方能立即重啟業務營運！</div>
                ${!isReadOnly ? `
                <div class="mt-1.5">
                    <button onclick="CEO_TELECOM.patchSecurity('${corp.id}')" class="btn-retro px-4 py-1.5 border-red-500 text-red-400 font-bold text-xs hover:bg-red-900 hover:text-white transition">
                        🛡️ 執行緊急資安防護與網路重啟 (-$12,000,000)
                    </button>
                </div>
                ` : ''}
            </div>`;
        }

        // 根據 business model 進行 UI 分流
        if (corp.bizModel === 'mno') {
            html += this.renderMnoUI(corp, isReadOnly);
        } else if (corp.bizModel === 'mvno') {
            html += this.renderMvnoUI(corp, isReadOnly);
        } else if (corp.bizModel === 'idc_cloud') {
            html += this.renderIdcUI(corp, isReadOnly);
        } else if (corp.bizModel === 'tech_holding') {
            html += this.renderHoldingUI(corp, isReadOnly);
        }
        
        html += `</div>`;
        contentArea.innerHTML = html;
    },

    // ==========================================
    // 2-A. MNO 基礎電信營運商 (mno) 面板
    // ==========================================
    renderMnoUI(corp, isReadOnly) {
        const state = corp.telecomState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let priceWarStatus = state.isPriceWarActive ? `<span class="text-red-500 animate-pulse font-bold">🚨 割喉流血價格戰中</span>` : `<span class="text-green-400 font-bold">🟢 市場價格常態</span>`;

        let html = `<h3 class="text-cyan font-bold mb-2 text-md flex items-center gap-1">📡 MNO 基礎電信營運商營運面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">基礎建設為王。CEO 必須持續投資 CapEx 擴建基地台，保證基建覆蓋率，並在「ARPU」與「用戶流失率」之間取得定價天平；隨時儲備現金，應對下一代 6G 通訊規格的重金競標！</p>`;

        // A. 核心營運數據
        html += `<div class="grid grid-cols-4 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">總活躍用戶數</div>
                <div class="text-cyan font-mono font-bold text-xs mt-1">${state.subscribers.toLocaleString()} 戶</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">基建覆蓋指數</div>
                <div class="font-mono font-bold text-xs mt-1 ${state.infraScore < 90 ? 'text-red-500 animate-pulse' : 'text-green-400'}">${Math.floor(state.infraScore)}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">月流失率 (Churn)</div>
                <div class="font-mono font-bold text-xs mt-1 ${state.churnRate > 0.08 ? 'text-red-400' : 'text-gray-400'}">${(state.churnRate * 100).toFixed(2)}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">電信市場狀態</div>
                <div class="text-xs mt-0.5">${priceWarStatus}</div>
            </div>
        </div>`;

        // B. 6G 國家頻譜競標警示
        if (state.g6Countdown >= 0) {
            let status6G = state.has6GLicense ? `<span class="text-green-400 font-bold">🟢 已取得 6G 國家頻譜特許特許</span>` : `<span class="text-yellow font-bold animate-pulse">⚠️ 6G 競標倒數中 (${state.g6Countdown} 天)</span>`;
            html += `<div class="mb-4 bg-cyan-950 bg-opacity-20 border border-cyan-800 p-3 rounded text-xs text-cyan flex justify-between items-center shadow-[0_0_10px_rgba(0,255,255,0.05)]">
                <div>
                    <div class="font-bold flex items-center gap-1">📡 NCC 國家 6G 標準提早確立通知</div>
                    <div class="text-xs text-gray-300 mt-1">若競標倒數結束仍未取得 6G 執照，公司將遭受用戶斷崖式雪崩流失！</div>
                    ${state.has6GLicense ? `<div class="text-xs text-green-400 mt-0.5">目前 6G 基地台覆蓋進度: <span class="font-bold">${state.g6Progress}%</span></div>` : ''}
                </div>
                <div class="text-right">
                    <div>${status6G}</div>
                    ${!state.has6GLicense && !isReadOnly ? `<button onclick="CEO_TELECOM.bidG6License('${corp.id}')" class="mt-2 btn-retro px-3 py-1 border-yellow text-yellow text-xs font-bold">繳納競標金 ($100,000,000)</button>` : ''}
                </div>
            </div>`;
        }

        if (!isReadOnly) {
            // C. 資費與基建決策
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">📊 資費定價與基建部署 (MNO Tuning)</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="text-xs text-gray-400 block">ARPU 資費定價 (目前):</label>
                        <div class="flex items-center gap-2">
                            <input type="range" min="200" max="1500" step="50" value="${state.arpu}"
                                   onchange="CEO_TELECOM.changeMnoArpu('${corp.id}', this.value)"
                                   class="w-2/3 cursor-pointer accent-cyan-500">
                            <span class="text-yellow font-mono font-bold">$${state.arpu}/月</span>
                        </div>
                        <div class="text-xs text-gray-400">※ 調漲資費會大幅提高流失率，且在價格戰期間流失率加倍。</div>
                    </div>
                    <div class="space-y-2 flex flex-col justify-center">
                        <label class="text-xs text-gray-400 block">5G/6G 基地台建設 (大額 CapEx):</label>
                        <div class="flex gap-2">
                            <button onclick="CEO_TELECOM.buildMnoBaseStation('${corp.id}')" class="btn-retro py-1.5 px-3 flex-1 border-cyan text-cyan text-xs font-bold">
                                🏗️ 擴建 5G 基站 (-$15,000,000)<br>
                                <span class="text-xs text-gray-400">覆蓋指數 +15，優化流失率</span>
                            </button>
                            ${state.has6GLicense && state.g6Progress < 100 ? `
                            <button onclick="CEO_TELECOM.buildG6BaseStation('${corp.id}')" class="btn-retro py-1.5 px-3 flex-1 border-purple-500 text-purple-400 text-xs font-bold animate-pulse">
                                📡 部署 6G 基地台 (-$50,000,000)<br>
                                <span class="text-xs text-gray-400">6G 進度 +25%，徹底留住高端戶</span>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>`;

            // D. 資安與技術債合規
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">🛡️ 企業資安防禦與技術債清除</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-2 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="text-gray-400">累積技術債: <span class="font-bold font-mono ${state.techDebt > 35 ? 'text-red-400 animate-pulse' : 'text-gray-400'}">${Math.floor(state.techDebt)}%</span></span>
                        <div class="text-xs text-gray-400 mt-1">※ 技術債會催化基站折舊成本。若技術債 > 50%，NCC 有機率強制斷網整頓！</div>
                    </div>
                    <button onclick="CEO_TELECOM.patchSecurity('${corp.id}')" class="btn-retro px-4 py-2 border-red-500 text-red-400 font-bold text-xs">
                        🛡️ 緊急資安升級與合規維護 (-$12,000,000)<br>
                        <span class="text-xs text-gray-400">技術債清償 40%，重置政府調查</span>
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-B. MVNO 虛擬電信商 (mvno) 面板
    // ==========================================
    renderMvnoUI(corp, isReadOnly) {
        const state = corp.telecomState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        // 計算頻寬佔用率
        let currentUsage = Math.floor(state.mvnoSubscribers * 1.5); // 每戶月均 1.5GB
        let usagePct = Math.min(100, (currentUsage / state.leaseCapacity) * 100);
        let usageColor = usagePct >= 90 ? 'text-red-500 font-bold animate-pulse' : (usagePct >= 70 ? 'text-yellow font-bold' : 'text-green-400');

        let html = `<h3 class="text-yellow-500 font-bold mb-2 text-md flex items-center gap-1">📶 MVNO 虛擬電信商營運面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">輕資產高周轉。虛擬電信商無自有基地台，必須向 MNO 批發租用頻寬容量。請隨時擴大租賃額度以應對大撒幣行銷帶來的人口暴增，防止頻寬塞車客訴流失率暴增！</p>`;

        // A. 數據看板
        html += `<div class="grid grid-cols-4 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">平價訂閱用戶</div>
                <div class="text-yellow-500 font-mono font-bold text-xs mt-1">${state.mvnoSubscribers.toLocaleString()} 戶</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">已租賃頻寬上限</div>
                <div class="font-mono font-bold text-xs mt-1 text-cyan">${state.leaseCapacity.toLocaleString()} GB</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">網路頻寬佔用率</div>
                <div class="font-mono font-bold text-xs mt-1 ${usageColor}">${usagePct.toFixed(1)}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">每GB批發租金</div>
                <div class="font-mono font-bold text-xs mt-1 text-white">$${state.leaseCostPerGb} / GB</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 租約與行銷決策
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-500 pl-1.5">🔌 頻寬批發容量升級與租用</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            let finalLeasePrice = isFirstYearSubsidized ? 6400000 : 8000000;
            let finalCampaign1 = isFirstYearSubsidized ? 4000000 : 5000000;
            let finalCampaign2 = isFirstYearSubsidized ? 16000000 : 20000000;

            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] flex justify-between items-center">
                <div>
                    <span class="font-bold">🔌 追加租賃頻寬 (+50,000 GB容量)</span>
                    <div class="text-xs text-gray-400 mt-1">擴充合約容量，消除因用戶暴增造成的頻寬塞車大雪崩。</div>
                </div>
                <button onclick="CEO_TELECOM.expandMvnoBandwidth('${corp.id}', ${finalLeasePrice})" class="btn-retro px-4 py-2 border-yellow text-yellow font-bold text-xs">
                    簽署追加租約 (-$${app.formatMoney(finalLeasePrice)})
                </button>
            </div>`;

            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-500 pl-1.5">📣 價格戰與激進行銷 (Marketing Blitz)</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-2 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <p class="text-xs text-gray-400 mb-3">透過強大預算大舉獲客。請注意：如果租賃頻寬不足，瘋狂湧入的用戶將直接塞爆網路，引爆大流失！</p>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="CEO_TELECOM.launchMvnoCampaign('${corp.id}', ${finalCampaign1}, 15000)" class="btn-retro text-left p-2.5 border-cyan text-cyan">
                        <div class="font-bold">📱 雙11吃到飽狂歡方案 (-$${app.formatMoney(finalCampaign1)})</div>
                        <div class="text-xs text-gray-400 mt-1">主打超低價平價吃到飽，引爆流量。</div>
                        <div class="text-green-400 font-bold text-xs mt-1.5">預計吸引新用戶: +15,000戶</div>
                    </button>
                    <button onclick="CEO_TELECOM.launchMvnoCampaign('${corp.id}', ${finalCampaign2}, 70000)" class="btn-retro text-left p-2.5 border-magenta text-magenta">
                        <div class="font-bold">🎮 電競與校園超能方案 (-$${app.formatMoney(finalCampaign2)})</div>
                        <div class="text-xs text-gray-400 mt-1">針對年輕遊戲族群進行重金網紅KOL聯名轟炸。</div>
                        <div class="text-green-400 font-bold text-xs mt-1.5">預計吸引新用戶: +70,000戶</div>
                    </button>
                </div>
            </div>`;

            // D. 資安與技術債合規
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-500 pl-1.5">🛡️ 企業資安防禦與技術債清除</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-2 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="text-gray-400">累積技術債: <span class="font-bold font-mono ${state.techDebt > 35 ? 'text-red-400 animate-pulse' : 'text-gray-400'}">${Math.floor(state.techDebt)}%</span></span>
                        <div class="text-xs text-gray-400 mt-1">※ 技術債會催化日常行政成本。若技術債 > 50%，NCC 有機率強制斷網整頓！</div>
                    </div>
                    <button onclick="CEO_TELECOM.patchSecurity('${corp.id}')" class="btn-retro px-4 py-2 border-red-500 text-red-400 font-bold text-xs">
                        🛡️ 緊急資安升級與合規維護 (-$12,000,000)<br>
                        <span class="text-xs text-gray-400">技術債清償 40%，重置政府調查</span>
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-C. 固網與資料中心 (idc_cloud) 面板
    // ==========================================
    renderIdcUI(corp, isReadOnly) {
        const state = corp.telecomState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        // 計算已簽約機櫃與空閒機櫃
        let racksUsed = state.activeContracts.reduce((sum, c) => sum + (c.racksNeeded || 0), 0);
        let idleRacks = Math.max(0, state.serverRacks - racksUsed);
        let idlePct = state.serverRacks > 0 ? (idleRacks / state.serverRacks) * 100 : 0;

        let html = `<h3 class="text-green-400 font-bold mb-2 text-md flex items-center gap-1">🖧 B2B 固網與 Tier 4 資料中心營運面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">科技巨頭的賣水人。CEO 可融資擴建機櫃並接取高毛利 B2B 企業級長約，每日按時獲得穩定的租金分成。請升級 PUE 綠能冷卻系統以大幅削減沉重的每日折舊與電力支出！</p>`;

        // A. 資料中心營運看板
        html += `<div class="grid grid-cols-4 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">建置總機櫃量</div>
                <div class="text-green-400 font-mono font-bold text-xs mt-1">${state.serverRacks.toLocaleString()} 組</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">已出租 / 空閒機櫃</div>
                <div class="font-mono font-bold text-xs mt-1 text-white">${racksUsed} / ${idleRacks} 組</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">資料中心稼動率</div>
                <div class="font-mono font-bold text-xs mt-1 text-cyan">${((1 - (idleRacks / state.serverRacks)) * 100).toFixed(1)}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">電能效能指數 (PUE)</div>
                <div class="font-mono font-bold text-xs mt-1 ${state.powerUsageEfficiency > 1.35 ? 'text-yellow' : 'text-green-400'}">${state.powerUsageEfficiency.toFixed(2)}</div>
            </div>
        </div>`;

        // B. 進行中的企業長約
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">💼 企業級在手 B2B 代管合約 (${state.activeContracts.length} 件)</h4>`;
        if (state.activeContracts.length === 0) {
            html += `<div class="bg-gray-950 border border-gray-900 p-4 text-center text-xs text-gray-400 rounded mb-5 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">目前暫無運行中的 B2B 合約，請盡快於下方承接招標！</div>`;
        } else {
            html += `<div class="bg-gray-950 border border-gray-900 rounded p-2 mb-5 space-y-2 max-h-[160px] overflow-y-auto shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">`;
            state.activeContracts.forEach((c) => {
                let contractRevDaily = c.racksNeeded * c.dailyFee;
                html += `<div class="bg-black border border-gray-900 p-2 rounded text-xs flex justify-between items-center text-gray-300">
                    <div>
                        <span class="text-green-400 font-bold">🏢 ${c.clientName}</span> | 租用機架: <span class="text-white font-bold">${c.racksNeeded}組</span> | 單架租金: <span class="text-cyan font-mono">$${c.dailyFee}/日</span>
                    </div>
                    <div class="text-right">
                        <div class="text-yellow font-bold font-mono">日進帳: +$${app.formatMoney(contractRevDaily)}</div>
                        <div class="text-xs text-gray-400">合約剩餘期: ${c.monthsLeft} 個月</div>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }

        if (!isReadOnly) {
            // C. 基礎建設擴建與綠能升級
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">🏗️ 機房擴建與綠能改裝 (IDC CapEx)</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            let finalBuildPrice = isFirstYearSubsidized ? 12000000 : 15000000;
            let finalPuePrice = isFirstYearSubsidized ? 28000000 : 35000000;

            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="CEO_TELECOM.buildIdcRacks('${corp.id}', ${finalBuildPrice})" class="btn-retro text-left p-2.5 border-green-600 text-green-400">
                        <div class="font-bold">🏗️ 擴建 10 組 Tier 4 機櫃 (-$${app.formatMoney(finalBuildPrice)})</div>
                        <div class="text-xs text-gray-400 mt-1">擴大雲端代管池，可承接更大規模企業長約。</div>
                    </button>
                    <button onclick="CEO_TELECOM.upgradeIdcCooling('${corp.id}', ${finalPuePrice})" class="btn-retro text-left p-2.5 border-yellow text-yellow ${state.powerUsageEfficiency <= 1.15 ? 'opacity-50 cursor-not-allowed' : ''}" ${state.powerUsageEfficiency <= 1.15 ? 'disabled' : ''}>
                        <div class="font-bold">🔋 綠能冷卻與液冷技術升級 (-$${app.formatMoney(finalPuePrice)})</div>
                        <div class="text-xs text-gray-400 mt-1">優化發電效率，使 PUE 降至 1.15，大減 30% 電力費。</div>
                    </button>
                </div>
            </div>`;

            // D. 機櫃招標平台
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">📢 B2B 機櫃代管招標平台 (待投標: ${state.idcPipeline.length} 件)</h4>`;
            if (state.idcPipeline.length === 0) {
                html += `<div class="bg-gray-950 border border-gray-900 p-4 text-center text-xs text-gray-400 rounded mb-2 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">當前暫無新合約招標案。換日有機會隨機刷新！</div>`;
            } else {
                html += `<div class="bg-gray-950 border border-gray-900 rounded p-2 mb-2 space-y-2 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">`;
                state.idcPipeline.forEach((p, idx) => {
                    let canAccept = idleRacks >= p.racksNeeded;
                    html += `<div class="bg-black border border-gray-900 p-2.5 rounded text-xs flex justify-between items-center text-gray-300">
                        <div>
                            <span class="text-cyan font-bold">📢 招標案: [${p.clientName}]</span>
                            <div class="text-xs text-gray-400 mt-1">需用機架: <span class="text-white font-bold">${p.racksNeeded}組</span> | 單架日租: <span class="text-green-400 font-mono font-bold">$${p.dailyFee}</span> | 租期: ${p.monthsLeft} 個月</div>
                        </div>
                        <button onclick="CEO_TELECOM.acceptIdcB2bContract('${corp.id}', ${idx})" ${!canAccept ? 'disabled' : ''} class="btn-retro px-3 py-1.5 border-green-600 text-green-400 font-bold text-xs ${!canAccept ? 'opacity-40 cursor-not-allowed' : ''}">
                            ${canAccept ? '🟢 立即簽署' : '❌ 空閒機架不足'}
                        </button>
                    </div>`;
                });
                html += `</div>`;
            }

            // D. 資安與技術債合規
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">🛡️ 企業資安防禦與技術債清除</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-2 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="text-gray-400">累積技術債: <span class="font-bold font-mono ${state.techDebt > 35 ? 'text-red-400 animate-pulse' : 'text-gray-400'}">${Math.floor(state.techDebt)}%</span></span>
                        <div class="text-xs text-gray-400 mt-1">※ 技術債會增加伺服器折舊。若技術債 > 50%，NCC 有機率強制斷網整頓！</div>
                    </div>
                    <button onclick="CEO_TELECOM.patchSecurity('${corp.id}')" class="btn-retro px-4 py-2 border-red-500 text-red-400 font-bold text-xs">
                        🛡️ 緊急資安升級與合規維護 (-$12,000,000)<br>
                        <span class="text-xs text-gray-400">技術債清償 40%，重置政府調查</span>
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-D. 電信投資控股 (tech_holding) 面板
    // ==========================================
    renderHoldingUI(corp, isReadOnly) {
        const state = corp.telecomState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-purple-400 font-bold mb-2 text-md flex items-center gap-1">🚀 電信投資控股與願景創投雷達</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">電信巨頭的降維打擊。本業每日穩定抽血大量現金注入創投資金池；CEO 可化身為 VC 天使投資人，融資豪賭前沿科技新創。新創上市將引爆百倍獲利，但新創造假破產亦可能讓投資直接歸零！</p>`;

        // A. 金流與創投看板
        html += `<div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">創投資金池 (Vision Fund)</div>
                <div class="text-purple-400 font-mono font-bold text-xs mt-1">$${app.formatMoney(state.holdingCashPool)}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">持有新創項目數</div>
                <div class="font-mono font-bold text-xs mt-1 text-white">${state.investments.length} 件</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">底層本業日進帳 (自動抽血)</div>
                <div class="font-mono font-bold text-xs mt-1 text-green-400">+$${app.formatMoney(state.subscribers * (state.arpu / 30))}</div>
            </div>
        </div>`;

        // B. 持有的創投投資組合 (Portfolio)
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">💼 願景基金持有之科技新創項目 (${state.investments.length} 件)</h4>`;
        if (state.investments.length === 0) {
            html += `<div class="bg-gray-950 border border-gray-900 p-4 text-center text-xs text-gray-400 rounded mb-5 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">願景基金目前無投資項目，請從下方創投雷達尋找獵物。</div>`;
        } else {
            html += `<div class="bg-gray-950 border border-gray-900 rounded p-2 mb-5 space-y-2 max-h-[200px] overflow-y-auto shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">`;
            state.investments.forEach((inv, idx) => {
                let currentVal = inv.investedAmount * inv.valMultiplier;
                let profit = currentVal - inv.investedAmount;
                let profitColor = profit >= 0 ? 'text-green-400' : 'text-red-400';
                let isIpoReady = inv.progress >= 100;

                html += `<div class="bg-black border border-gray-900 p-2.5 rounded text-xs flex justify-between items-center text-gray-300">
                    <div>
                        <div class="font-bold flex items-center gap-1.5">
                            <span class="text-purple-400">🚀 ${inv.name}</span>
                            <span class="text-xs bg-purple-950 text-purple-300 px-1 border border-purple-800 rounded">${inv.stage} / ${inv.type}</span>
                        </div>
                        <div class="text-xs text-gray-400 mt-1">投資成本: <span class="text-white font-mono">$${app.formatMoney(inv.investedAmount)}</span> | 研發上市進度: <span class="text-cyan font-bold">${inv.progress}%</span></div>
                    </div>
                    <div class="text-right flex items-center gap-3">
                        <div>
                            <div class="text-white font-mono font-bold">估值: $${app.formatMoney(currentVal)}</div>
                            <div class="text-xs ${profitColor}">帳面回報: ${(inv.valMultiplier).toFixed(2)}倍</div>
                        </div>
                        ${!isReadOnly ? `
                        <button onclick="CEO_TELECOM.exitHoldingVC('${corp.id}', ${idx})" class="btn-retro px-2.5 py-1.5 border-yellow text-yellow font-bold text-xs animate-pulse">
                            ${isIpoReady ? '🔔 上市套現退出' : '🔌 認賠割肉退出'}
                        </button>
                        ` : ''}
                    </div>
                </div>`;
            });
            html += `</div>`;
        }

        if (!isReadOnly) {
            // C. 願景創投雷達 (隨機未上市案源)
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">📡 願景基金創投案源雷達 (待融資: ${state.vcRadar.length} 件)</h4>`;
            if (state.vcRadar.length === 0) {
                html += `<div class="bg-gray-950 border border-gray-900 p-4 text-center text-xs text-gray-400 rounded mb-2 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">創投雷達掃描中。每日換日隨機湧現獨角獸新創項目！</div>`;
            } else {
                html += `<div class="bg-gray-950 border border-gray-900 rounded p-2 mb-2 space-y-2 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">`;
                state.vcRadar.forEach((vc, idx) => {
                    let hasFund = state.holdingCashPool >= vc.requiredCapital;
                    let riskLabel = vc.risk >= 0.7 ? '🔴 極高風險(易暴死)' : (vc.risk >= 0.4 ? '🟡 中等風險' : '🟢 低風險(穩健)');
                    html += `<div class="bg-black border border-gray-900 p-2.5 rounded text-xs flex justify-between items-center text-gray-300">
                        <div>
                            <span class="text-purple-300 font-bold">🦄 融資標的: [${vc.name}]</span>
                            <div class="text-xs text-gray-400 mt-1">融資階段: <span class="text-white font-bold">${vc.stage}</span> | 賽道: <span class="text-white font-bold">${vc.type}</span></div>
                            <div class="text-xs text-gray-400 mt-0.5">預估融資額: <span class="text-cyan font-mono font-bold">$${app.formatMoney(vc.requiredCapital)}</span> | 研發風險評估: <span class="font-bold">${riskLabel}</span></div>
                        </div>
                        <button onclick="CEO_TELECOM.investInHoldingVC('${corp.id}', ${idx})" ${!hasFund ? 'disabled' : ''} class="btn-retro px-3.5 py-2 border-purple-500 text-purple-400 font-bold text-xs ${!hasFund ? 'opacity-40 cursor-not-allowed' : 'animate-pulse'}">
                            ${hasFund ? '💰 注資入股' : '❌ 資金池儲備不足'}
                        </button>
                    </div>`;
                });
                html += `</div>`;
            }

            // D. 資安與技術債合規
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">🛡️ 企業資安防禦與技術債清除</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-2 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="text-gray-400">累積技術債: <span class="font-bold font-mono ${state.techDebt > 35 ? 'text-red-400 animate-pulse' : 'text-gray-400'}">${Math.floor(state.techDebt)}%</span></span>
                        <div class="text-xs text-gray-400 mt-1">※ 技術債會增加電信系統維護負擔。若技術債 > 50%，NCC 有機率強制斷網整頓！</div>
                    </div>
                    <button onclick="CEO_TELECOM.patchSecurity('${corp.id}')" class="btn-retro px-4 py-2 border-red-500 text-red-400 font-bold text-xs">
                        🛡️ 緊急資安升級與合規維護 (-$12,000,000)<br>
                        <span class="text-xs text-gray-400">技術債清償 40%，重置政府調查</span>
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 3. 玩家決策 API 實作
    // ==========================================
    changeMnoArpu(corpId, val) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp || !corp.telecomState) return;
        corp.telecomState.arpu = parseInt(val) || 200;
        app.updateUI();
    },

    buildMnoBaseStation(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp || !corp.telecomState) return;
        
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let cost = isFirstYearSubsidized ? 12000000 : 15000000; // 90天保護期打8折

        if (corp.corporateCash < cost) return alert("公司可用資金不足以擴建 5G 基地台！");
        
        corp.corporateCash -= cost;
        corp.monthExpense = (corp.monthExpense || 0) + cost; // 100% 記帳配平
        corp.telecomState.infraScore = Math.min(200, (corp.telecomState.infraScore || 100) + 15);
        
        app.log(`【基建擴張】${corp.name} 斥資 $${app.formatMoney(cost)} 批量部署 5G 基地台，覆蓋指數攀升至 ${Math.floor(corp.telecomState.infraScore)}%！`, 'text-cyan font-bold');
        app.updateUI();
    },

    bidG6License(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp || !corp.telecomState) return;
        
        const cost = 100000000; // 一億競標金
        if (corp.corporateCash < cost) return alert("公司可用現金不足以參與 6G 國家頻譜競標！");

        corp.corporateCash -= cost;
        corp.monthExpense = (corp.monthExpense || 0) + cost; // 100% 記帳配平
        corp.telecomState.has6GLicense = true;
        corp.telecomState.g6Progress = 20; // 得標自帶 20% 初始覆蓋

        app.log(`【頻譜得標】${corp.name} 霸氣繳納 $100,000,000 特許競標金，強勢奪下 NCC 黃金 6G 國家特許頻段！`, 'text-yellow font-bold text-lg');
        app.updateUI();
    },

    buildG6BaseStation(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp || !corp.telecomState) return;

        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let cost = isFirstYearSubsidized ? 40000000 : 50000000; // 90天保護期打8折

        if (corp.corporateCash < cost) return alert("公司可用現金不足以批量部署 6G 超能基站！");

        corp.corporateCash -= cost;
        corp.monthExpense = (corp.monthExpense || 0) + cost; // 100% 記帳配平
        corp.telecomState.g6Progress = Math.min(100, (corp.telecomState.g6Progress || 0) + 25);
        corp.telecomState.infraScore = Math.min(200, (corp.telecomState.infraScore || 100) + 20);

        app.log(`【6G 軍備競賽】${corp.name} 斥資 $${app.formatMoney(cost)} 批量追加部署 6G 微型蜂巢基站，6G 覆蓋進度已達 ${corp.telecomState.g6Progress}%！`, 'text-purple-400 font-bold');
        app.updateUI();
    },

    patchSecurity(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp || !corp.telecomState) return;

        const cost = 12000000; // 一千兩百萬資安升級
        if (corp.corporateCash < cost) return alert("公司可用現金不足以支付資安緊急處置費用！");

        corp.corporateCash -= cost;
        corp.monthExpense = (corp.monthExpense || 0) + cost; // 100% 記帳配平
        corp.telecomState.techDebt = Math.max(0, (corp.telecomState.techDebt || 0) - 40);
        corp.telecomState.marketReputation = Math.min(100, (corp.telecomState.marketReputation || 100) + 15);
        
        if (corp.telecomState.isSuspended) {
            corp.telecomState.isSuspended = false;
            corp.telecomState.regulationDaysLeft = 0;
            app.log(`【資安重建】${corp.name} 完成了緊急技術債清償與合規性重組，NCC 宣布解除行政停牌，全面恢復電信營運！`, 'text-green-400 font-bold text-lg');
        } else {
            app.log(`【資安護航】${corp.name} 部署了全新次世代防禦防火牆，清除技術債 40%，有效降低被國家調查風險！`, 'text-cyan font-bold');
        }
        app.updateUI();
    },

    expandMvnoBandwidth(corpId, cost) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp || !corp.telecomState) return;

        if (corp.corporateCash < cost) return alert("公司可用現金不足以升級追加頻寬合約！");

        corp.corporateCash -= cost;
        corp.monthExpense = (corp.monthExpense || 0) + cost; // 100% 記帳配平
        corp.telecomState.leaseCapacity = (corp.telecomState.leaseCapacity || 30000) + 50000;

        app.log(`【頻寬擴容】${corp.name} 成功向基礎電信商簽署了追加租約，批發頻寬上限擴增至 ${corp.telecomState.leaseCapacity.toLocaleString()} GB/月！`, 'text-cyan font-bold');
        app.updateUI();
    },

    launchMvnoCampaign(corpId, cost, newSubs) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp || !corp.telecomState) return;

        if (corp.corporateCash < cost) return alert("公司可用現金不足以啟動行銷方案！");

        corp.corporateCash -= cost;
        corp.monthExpense = (corp.monthExpense || 0) + cost; // 100% 記帳配平
        
        // 獲客效率受頻寬是否充足影響
        let currentUsage = Math.floor(corp.telecomState.mvnoSubscribers * 1.5);
        let ratio = currentUsage >= corp.telecomState.leaseCapacity ? 0.3 : 1.0;
        let actualSubs = Math.floor(newSubs * ratio);

        corp.telecomState.mvnoSubscribers = (corp.telecomState.mvnoSubscribers || 0) + actualSubs;
        
        if (ratio < 1.0) {
            app.log(`【行銷折損警告】由於 ${corp.name} 的頻寬嚴重塞車，大量新湧入的用戶因體驗不佳憤而退租，最終僅成功獲客 ${actualSubs.toLocaleString()} 戶！`, 'text-yellow font-bold');
        } else {
            app.log(`【行銷戰捷報】${corp.name} 大舉撒幣行銷，成功引爆市場熱情，平價用戶數暴增 ${actualSubs.toLocaleString()} 戶！`, 'text-yellow font-bold');
        }
        app.updateUI();
    },

    buildIdcRacks(corpId, cost) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp || !corp.telecomState) return;

        if (corp.corporateCash < cost) return alert("公司可用現金不足以擴建機櫃！");

        corp.corporateCash -= cost;
        corp.monthExpense = (corp.monthExpense || 0) + cost; // 100% 記帳配平
        corp.telecomState.serverRacks = (corp.telecomState.serverRacks || 0) + 10;

        app.log(`【IDC擴建】${corp.name} 耗資 $${app.formatMoney(cost)} 順利擴建了 10 組全新 Tier 4 精密伺服器機櫃，總容量達 ${corp.telecomState.serverRacks} 組！`, 'text-green-400 font-bold');
        app.updateUI();
    },

    upgradeIdcCooling(corpId, cost) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp || !corp.telecomState) return;

        if (corp.corporateCash < cost) return alert("公司可用現金不足以升級冷卻技術！");

        corp.corporateCash -= cost;
        corp.monthExpense = (corp.monthExpense || 0) + cost; // 100% 記帳配平
        corp.telecomState.powerUsageEfficiency = 1.15; // 升級為極限液冷 PUE 1.15

        app.log(`【節能科技】${corp.name} 升級了核心浸沒式液冷散熱技術，PUE 指數暴降至 1.15，大幅削減每日運維電費 30%！`, 'text-green-400 font-bold');
        app.updateUI();
    },

    acceptIdcB2bContract(corpId, idx) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp || !corp.telecomState) return;
        const state = corp.telecomState;

        const p = state.idcPipeline[idx];
        if (!p) return;

        // 重新檢測剩餘空閒機架
        let racksUsed = state.activeContracts.reduce((sum, c) => sum + (c.racksNeeded || 0), 0);
        let idleRacks = Math.max(0, state.serverRacks - racksUsed);
        if (idleRacks < p.racksNeeded) return alert("空閒機架數量不足以承接此招標合約！");

        // 簽署合約
        state.activeContracts.push(p);
        state.idcPipeline.splice(idx, 1);

        app.log(`【簽約喜報】${corp.name} 與企業客戶 [${p.clientName}] 正式完成代管簽約！即日起每日保證進帳 +$${app.formatMoney(p.racksNeeded * p.dailyFee)}！`, 'text-green-400 font-bold text-lg');
        app.updateUI();
    },

    investInHoldingVC(corpId, idx) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp || !corp.telecomState) return;
        const state = corp.telecomState;

        const vc = state.vcRadar[idx];
        if (!vc) return;

        if (state.holdingCashPool < vc.requiredCapital) return alert("願景創投資金池儲備不足！");

        // 扣除資金池
        state.holdingCashPool -= vc.requiredCapital;
        corp.monthExpense = (corp.monthExpense || 0) + vc.requiredCapital; // 100% 記帳配平

        // 移入投資組合
        state.investments.push({
            id: vc.id,
            name: vc.name,
            type: vc.type,
            stage: vc.stage,
            investedAmount: vc.requiredCapital,
            valMultiplier: 1.0,
            risk: vc.risk,
            progress: 20 // 初始研發/上市進度
        });

        // 移出案源雷達
        state.vcRadar.splice(idx, 1);

        app.log(`【願景投資】${corp.name} 願景基金完成對新創 [${vc.name}] 的 ${vc.stage} 融資注資，投資金額 $${app.formatMoney(vc.requiredCapital)}！`, 'text-purple-400 font-bold');
        app.updateUI();
    },

    exitHoldingVC(corpId, idx) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp || !corp.telecomState) return;
        const state = corp.telecomState;

        const inv = state.investments[idx];
        if (!inv) return;

        let exitValue = Math.floor(inv.investedAmount * inv.valMultiplier);
        let profit = exitValue - inv.investedAmount;
        let isIpoReady = inv.progress >= 100;

        if (isIpoReady) {
            // 上市套現退出
            state.holdingCashPool += exitValue;
            corp.monthRevenue = (corp.monthRevenue || 0) + exitValue; // 100% 記帳配平
            app.log(`【創投神話】${corp.name} 持有的 [${inv.name}] 成功在美國納斯達克 IPO 上市！願景基金豪取 ${inv.valMultiplier.toFixed(2)} 倍神話級報酬，一鍵套現退出，落袋現金 $${app.formatMoney(exitValue)}！`, 'text-yellow font-bold text-lg animate-pulse');
        } else {
            // 割肉退出 (技術不達標認賠)
            let penaltyValue = Math.floor(exitValue * 0.4); // 割肉剩40%
            state.holdingCashPool += penaltyValue;
            corp.monthRevenue = (corp.monthRevenue || 0) + penaltyValue; // 100% 記帳配平
            app.log(`【認賠割肉】因新創 [${inv.name}] 的技術開發嚴重停滯，${corp.name} 決定及時停損，在次級市場折價割肉轉讓股權，僅收回殘值 $${app.formatMoney(penaltyValue)}...`, 'text-red-400');
        }

        // 移出投資組合
        state.investments.splice(idx, 1);
        app.updateUI();
    },

    // ==========================================
    // 4. 每日獲利與結算邏輯 (Process Revenue)
    // ==========================================
    processRevenue(corp) {
        // [自我修復與初始化防禦]
        if (!corp.telecomState || !corp.bizModel) {
            this.initAssets(corp);
        }
        
        const state = corp.telecomState;
        
        // 全域 NaN 清洗防禦，確保極致安全
        if (isNaN(state.infraScore) || state.infraScore < 0) state.infraScore = 100;
        if (isNaN(state.marketReputation) || state.marketReputation < 0) state.marketReputation = 100;
        if (isNaN(state.techDebt) || state.techDebt < 0) state.techDebt = 0;
        if (isNaN(state.subscribers) || state.subscribers < 0) state.subscribers = 100000;
        if (isNaN(state.arpu) || state.arpu < 0) state.arpu = 500;
        if (isNaN(state.churnRate) || state.churnRate < 0) state.churnRate = 0.04;
        if (isNaN(state.mvnoSubscribers) || state.mvnoSubscribers < 0) state.mvnoSubscribers = 10000;
        if (isNaN(state.leaseCapacity) || state.leaseCapacity < 0) state.leaseCapacity = 30000;
        if (isNaN(state.serverRacks) || state.serverRacks < 0) state.serverRacks = 30;
        if (isNaN(state.powerUsageEfficiency) || state.powerUsageEfficiency < 1.0) state.powerUsageEfficiency = 1.6;
        if (isNaN(state.holdingCashPool) || state.holdingCashPool < 0) state.holdingCashPool = 0;

        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);

        // A. 隨機事件生成 (待簽招標合約、投資案源)
        if (Math.random() < 0.05 && state.idcPipeline.length < 3) {
            // 生成一個 IDC B2B 長約招標
            const clientNames = ['微軟教育雲', 'OpenAI算力庫', '鈊象伺服器擴容', 'Google精準廣告部', '台積電私有雲'];
            const randomClient = clientNames[Math.floor(Math.random() * clientNames.length)];
            const racks = Math.floor(Math.random() * 15) + 5;
            const fee = Math.floor(Math.random() * 400) + 1000; // 1000~1400 元/日
            state.idcPipeline.push({
                id: `B2B-RAND-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                clientName: randomClient,
                racksNeeded: racks,
                dailyFee: fee,
                monthsLeft: Math.floor(Math.random() * 24) + 12 // 12~36 個月
            });
        }

        if (Math.random() < 0.08 && state.vcRadar.length < 3) {
            // 生成一個新創投資機會
            const newNames = ['量子加密鏈', '低軌衛星天線', '全綠能冷卻液', '6G超導濾波器', 'AI自動化核算'];
            const randomName = newNames[Math.floor(Math.random() * newNames.length)];
            const stages = ['種子輪', '天使輪', 'A輪'];
            const selectedStage = stages[Math.floor(Math.random() * stages.length)];
            const types = ['前沿硬體', '演算法軟體', '通訊組件'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            const cap = selectedStage === '種子輪' ? 5000000 : (selectedStage === '天使輪' ? 12000000 : 35000000);
            const rsk = 0.2 + Math.random() * 0.6; // 20%~80% 研發失敗風險
            state.vcRadar.push({
                id: `VC-RAND-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                name: randomName,
                stage: selectedStage,
                type: type,
                requiredCapital: cap,
                risk: rsk
            });
        }

        // B. 技術債每日累積與 NCC 調查判定
        state.techDebt = Math.min(100, (state.techDebt || 0) + 0.05); // 每日微幅累積 0.05%
        if (state.techDebt > 55 && Math.random() < 0.005 && !state.isSuspended) {
            state.isSuspended = true;
            state.regulationDaysLeft = 7; // 停牌整頓 7 天
            app.log(`【🚨 國家 NCC 重罰斷網】 NCC 檢測到企業 ${corp.name} 內網爆發大規模安全漏洞且未按時修復，下令停牌斷網整改 7 天，每日營收清零！`, 'text-red-500 font-bold animate-pulse');
        }

        if (state.isSuspended) {
            state.regulationDaysLeft--;
            if (state.regulationDaysLeft <= 0) {
                state.isSuspended = false;
                app.log(`【營運恢復】NCC 的 7 天停牌整改期滿，${corp.name} 重獲網際網路權限，全面恢復業務營運！`, 'text-green-400 font-bold');
            }
        }

        // C. 被動/宏觀變數影響
        // 與科技板塊深度共生：當軟體與 AI 板塊指數繁榮時，IDC 稼動率有加成，而 MNO 承受塞車壓力
        let sciTrend = (typeof app !== 'undefined' && app.state && app.state.sectorMetrics && app.state.sectorMetrics.software_ai) ? app.state.sectorMetrics.software_ai : 0;
        
        // 頻譜 6G 競標倒數
        if (state.g6Countdown > 0) {
            state.g6Countdown--;
            if (state.g6Countdown === 0 && !state.has6GLicense) {
                app.log(`【🚨 6G 專利過期】${corp.name} 因未能及時籌措資金搶下 6G 特許頻譜執照，全網 6G 專利全面缺失，高端用戶發生斷崖式集體叛逃！`, 'text-red-500 font-bold animate-pulse');
            }
        }

        // 巨災被動事故機率觸發
        if (corp.bizModel === 'idc_cloud' && Math.random() < 0.005) {
            // 被動斷電賠償事故
            let compensation = Math.floor(state.serverRacks * 100000); // 每個機架 10 萬元賠償
            if (corp.corporateCash >= compensation) {
                corp.corporateCash -= compensation;
                corp.monthExpense = (corp.monthExpense || 0) + compensation; // 100% 記帳配平
                app.log(`【🚨 資料中心冷卻故障】極端特大熱浪襲擊！${corp.name} 資料中心冷卻泵突發大規模停機斷電，科技巨頭主機大面積宕機，金控扣除賠償罰金 -$${app.formatMoney(compensation)}！`, 'text-red-500 font-bold animate-pulse');
            } else {
                let actualPaid = corp.corporateCash;
                corp.monthExpense = (corp.monthExpense || 0) + actualPaid; // 100% 記帳配平
                corp.corporateCash = 0;
                app.log(`【💥 賠償性被迫賤賣】資料中心特大斷電事故！因現金池極度不足，電信商 ${corp.name} 無力足額賠付客戶，NCC 下令扣除所有公司現金並查封 5 組伺服器機櫃抵債！`, 'text-red-500 font-bold animate-pulse');
                state.serverRacks = Math.max(0, state.serverRacks - 5);
            }
            state.infraScore = Math.max(50, state.infraScore - 15);
        }

        // ==========================================
        // D. 每日財務收支結算的分流運算 (Daily Settlement)
        // ==========================================
        let dailyRevenue = 0;
        let dailyExpense = 0;

        if (!state.isSuspended) {
            // A. MNO 基礎電信營運商
            if (corp.bizModel === 'mno') {
                // 基礎流失率 Churn Rate 計算模型：基建覆蓋越好 Churn 越低；ARPU 越高 Churn 越高；6G落後 Churn 翻倍
                let baseChurn = 0.04;
                let arpuFactor = Math.max(0.5, state.arpu / 500); // 基準以500為1.0倍
                let infraFactor = Math.max(0.2, 2.0 - (state.infraScore / 100)); // 覆蓋率 100% 為 1.0倍
                let g6Factor = (state.g6Countdown === 0 && !state.has6GLicense) ? 2.5 : 1.0;

                state.churnRate = Math.min(0.5, baseChurn * arpuFactor * infraFactor * g6Factor);

                // 被動價格戰影響 (若 macro 連動是價格戰，流失率與獲客率遭挫)
                let isMarketPriceWar = (app.state && app.state.marketState === '價格戰') || state.isPriceWarActive;
                if (isMarketPriceWar) {
                    state.churnRate = Math.min(0.6, state.churnRate * 1.5);
                }

                // 每日用戶成長與流失
                let loss = Math.floor(state.subscribers * (state.churnRate / 30));
                let reputationGain = Math.floor((state.infraScore * state.marketReputation) / 100 * (100 + Math.random() * 50));
                let newUsers = isMarketPriceWar ? Math.floor(reputationGain * 0.4) : reputationGain;

                state.subscribers = Math.max(1000, state.subscribers - loss + newUsers);

                // 每日電信帳單營收
                dailyRevenue = Math.floor(state.subscribers * (state.arpu / 30));

                // 每日基地台基建與運維折舊支出 (受技術債與90天保護法案影響)
                let maintCost = state.subscribers * 0.15 + (state.infraScore * 800);
                let techDebtMultiplier = 1 + (state.techDebt / 100) * 0.5; // 技術債加速成本折舊
                let finalMaint = maintCost * techDebtMultiplier;
                
                if (isFirstYearSubsidized) finalMaint *= 0.5; // 90天保護期減免 50% 電力與維護

                dailyExpense = Math.floor(finalMaint);
            }
            
            // B. MVNO 虛擬電信商
            else if (corp.bizModel === 'mvno') {
                let usage = Math.floor(state.mvnoSubscribers * 1.5); // 每日/每戶月均總流量 (GB)
                let usageDailyGb = Math.max(100, usage / 30);
                
                // 頻寬塞車判定模型
                let isCongested = usage > state.leaseCapacity;
                state.mvnoChurn = isCongested ? 0.35 : 0.07; // 塞車流失率暴增至 35%

                let loss = Math.floor(state.mvnoSubscribers * (state.mvnoChurn / 30));
                let newUsers = isCongested ? 0 : Math.floor(500 + Math.random() * 300); // 塞車時無法招攬新戶

                state.mvnoSubscribers = Math.max(500, state.mvnoSubscribers - loss + newUsers);

                // 每日營收
                dailyRevenue = Math.floor(state.mvnoSubscribers * (state.mvnoArpu / 30));

                // 每日頻寬批發租用費 (付給 MNO/IDC 批發商)
                let bandwidthCost = usageDailyGb * state.leaseCostPerGb;
                if (isFirstYearSubsidized) bandwidthCost *= 0.5; // 90天政策折減

                dailyExpense = Math.floor(bandwidthCost);
            }
            
            // C. 固網與資料中心 (idc_cloud)
            else if (corp.bizModel === 'idc_cloud') {
                // 結算 activeContracts 長約的每日租金進帳
                dailyRevenue = state.activeContracts.reduce((sum, c) => sum + (c.racksNeeded * c.dailyFee), 0);

                // 如果軟體板塊爆發式繁榮 (SCI > 0)，獲得 20% 被動流量算力分成加成
                if (sciTrend > 0.05) {
                    dailyRevenue *= (1 + sciTrend * 0.5);
                }

                // 每日機架電力與折舊運維支出 (PUE 節能效益)
                let baseMaint = state.serverRacks * state.rackMaintDaily * (state.powerUsageEfficiency / 1.6);
                if (isFirstYearSubsidized) baseMaint *= 0.5; // 90天保護減半

                dailyExpense = Math.floor(baseMaint);

                // 更新 activeContracts 剩餘租期 (每月換月時由外層減少，此處以天換算)
                // 在手長約每隔 30 天期滿
                if (app.state && app.state.date.getDate() === 1) {
                    state.activeContracts.forEach(c => {
                        if (c.monthsLeft > 0) c.monthsLeft--;
                    });
                    // 清除期滿的長約
                    state.activeContracts = state.activeContracts.filter(c => c.monthsLeft > 0);
                }
            }
            
            // D. 電信投資控股 (tech_holding)
            else if (corp.bizModel === 'tech_holding') {
                // 1. 本業抽血穩定進帳 (每日收租)
                dailyRevenue = Math.floor(state.subscribers * (state.arpu / 30));
                
                // 本業運營小額支出
                dailyExpense = Math.floor(state.subscribers * 0.1);
                if (isFirstYearSubsidized) dailyExpense *= 0.5;

                // 本業盈餘每日自動吸血抽進 holdingCashPool
                let dailyNet = Math.max(0, dailyRevenue - dailyExpense);
                
                // 自動將本業日淨利打入創投池，不扣除 corporateCash，但讓 holdingCashPool 增長，作為盲盒本金
                state.holdingCashPool = (state.holdingCashPool || 0) + dailyNet;

                // 2. 進行中的 VC 投資項目估值波動與研發/上市進度
                state.investments.forEach(inv => {
                    // 每日有 0.3% 機率研發遭遇重大突破 (progress 暴增)
                    if (Math.random() < 0.03) {
                        inv.progress = Math.min(100, inv.progress + Math.floor(Math.random() * 15) + 5);
                    }
                    
                    // 估值隨著 progress 及宏觀景氣波動 (每日波動 -2% ~ +4%)
                    let sciFactor = sciTrend > 0 ? (1 + sciTrend * 0.2) : 0.98;
                    let drift = (Math.random() * 0.06 - 0.02) * sciFactor;
                    inv.valMultiplier = Math.max(0.1, inv.valMultiplier * (1 + drift));

                    // 每日 1.2% 的機率該項目成功推進 IPO 倒計時，但前提是 progress 達 100
                    if (inv.progress >= 100) {
                        // 上市準備，估值乘數強制保底 x3
                        inv.valMultiplier = Math.max(3.0, inv.valMultiplier);
                    }

                    // 每日有極小機率 (0.15% * risk) 新創因爆發財務造假而倒閉
                    if (Math.random() < (0.0015 * inv.risk)) {
                        app.log(`【💥 願景創投雷達爆雷】特大黑天鵝！新創項目 [${inv.name}] 被爆出帳目造假與核心技術騙局，宣告破產清算，投資全部歸零！`, 'text-red-500 font-bold animate-pulse');
                        inv.valMultiplier = 0;
                        inv.progress = 0;
                    }
                });

                // 清理爆雷項目
                state.investments = state.investments.filter(inv => inv.valMultiplier > 0);
            }
        }

        // E. 國家扶持法案特許收益注入
        if (isFirstYearSubsidized) {
            dailyRevenue += 25000; // 國家偏鄉特許數位覆蓋保證補貼
        }

        // 確保為整數
        dailyRevenue = Math.floor(dailyRevenue);
        dailyExpense = Math.floor(dailyExpense);

        // 100% 將每日收支結算寫回底層系統可用現金及月度財務記帳 (配平防護)
        corp.corporateCash = Math.max(0, corp.corporateCash + dailyRevenue - dailyExpense);
        corp.monthRevenue = (corp.monthRevenue || 0) + dailyRevenue;
        corp.monthExpense = (corp.monthExpense || 0) + dailyExpense;
        corp.lastDailyRev = dailyRevenue;
        corp.lastDailyExp = dailyExpense;
        
        // 將每日結算結果同步累加至企業利潤，保證本益比/EPS 系統正確對接
        corp.dailyProfit = dailyRevenue - dailyExpense;
    }
};

window.CEO_TELECOM = CEO_TELECOM;

