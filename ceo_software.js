// ceo_software.js - 軟體與 AI 產業（四大商業模型）核心模擬子系統
const CEO_SOFTWARE = {
    // ==========================================
    // 1. 初始化資產 (Init Assets)
    // ==========================================
    initAssets(corp) {
        if (!corp.softwareState) {
            corp.softwareState = {
                // 通用軟體與 AI 狀態
                techDebt: 0,                // 技術債百分比 (0% ~ 100%)
                hasEthicCommittee: false,   // 是否成立 AI 道德委員會 (合規性投資)
                isSuspended: false,         // 是否因監管調查遭暫停營運
                regulationDaysLeft: 0,      // 監管整改剩餘天數
                
                // SaaS 訂閱服務 (subscription)
                subscribers: 5000,          // 訂閱會員數
                monthlyFee: 15,             // 訂閱月費 (USD/TWD 換算基準)
                churnRate: 0.05,            // 基礎流失率 (5%)
                rdIterDaily: 8000,          // 每日產品迭代 R&D 支出
                cacBudget: 0,               // 當前 CAC 獲客投放暫存
                
                // AI 模型訓練與算力 (ai_model)
                modelName: 'GPT-1',         // 大模型版本
                modelParamLevel: 1,         // 參數規模等級 (1=GPT-1 ~ 5=GPT-5)
                isOpenSource: false,        // 是否開源
                tokenPrice: 0.005,          // 每百萬 Token 呼叫費 (API 售價)
                tokenCalls: 200,            // 每日 API 呼叫量 (百萬次 Token)
                gpuComputeCapacity: 100,    // GPU 算力容量 (H100 等效數量)
                trainingProgress: 0,        // 下一代模型訓練進度 (0% ~ 100%)
                
                // 廣告與數據平台 (ads_platform)
                dau: 20000,                 // 每日活躍用戶 (DAU)
                adDensity: 100,             // 廣告顯示密度指數 (100% 為基準)
                seoDailyBudget: 5000,       // 每日 SEO 流量維護支出
                adPrivacyLevel: 'balanced', // 隱私合規政策 ('aggressive', 'balanced', 'strictly_compliant')
                userAnnoyance: 0,           // 用戶厭惡指數
                
                // 系統整合與授權 (si_services)
                seniorEngineers: 8,         // 高級顧問工程師人數
                deliverySpeed: 1.0,         // 交付速度係數
                licensingActiveClients: 3,  // 授權維護在手企業戶
                licensingDailyFee: 600,     // 單一戶每日貢獻之軟體授權維護年費
                siBacklog: []               // 客製化專案 pipeline: { id, name, value, daysLeft, progress, requiredSpeed }
            };
        }

        const state = corp.softwareState;
        const p = corp.price || corp.basePrice || 100;
        const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;

        // 玩家創立之公司初始資源 (空殼公司特許扶持)
        if (corp.isPlayerFounded) {
            if (corp.bizModel === 'subscription') {
                state.subscribers = 15000;
                state.monthlyFee = 15;
                state.rdIterDaily = 12000;
            } else if (corp.bizModel === 'ai_model') {
                state.modelName = 'GPT-1';
                state.modelParamLevel = 1;
                state.gpuComputeCapacity = 120;
                state.tokenCalls = 300;
            } else if (corp.bizModel === 'ads_platform') {
                state.dau = 80000;
                state.adDensity = 100;
                state.seoDailyBudget = 10000;
            } else if (corp.bizModel === 'si_services') {
                state.seniorEngineers = 15;
                state.licensingActiveClients = 5;
                // 注入初始起航合約
                state.siBacklog.push({
                    id: `SI-${Date.now()}`,
                    name: '政府機關跨海關大數據資訊整合系統',
                    value: 15000000,
                    daysLeft: 15,
                    progress: 0,
                    requiredSpeed: 100 // 15人顧問團隊可在工期內無壓力完成
                });
            }
            return;
        }

        // ==========================================
        // 非玩家（上市公司）根據規模與代表企業給予初始資源
        // ==========================================
        
        // A. SaaS 訂閱服務 (subscription)
        if (corp.bizModel === 'subscription') {
            state.subscribers = scale * 80000 + 20000;
            state.monthlyFee = corp.id === 'MSFT' ? 20 : 12;
            state.rdIterDaily = scale * 50000 + 15000;
        }
        
        // B. AI 模型與算力 (ai_model)
        else if (corp.bizModel === 'ai_model') {
            if (corp.id === 'OAI') {
                state.modelName = 'GPT-4';
                state.modelParamLevel = 4;
                state.gpuComputeCapacity = scale * 1000 + 500;
                state.tokenCalls = scale * 2500 + 1000;
                state.tokenPrice = 0.003; // 規模大 API 便宜
            } else {
                state.modelName = 'GPT-2';
                state.modelParamLevel = 2;
                state.gpuComputeCapacity = scale * 200 + 100;
                state.tokenCalls = scale * 500 + 200;
            }
        }
        
        // C. 廣告與數據平台 (ads_platform)
        else if (corp.bizModel === 'ads_platform') {
            state.dau = scale * 500000 + 100000;
            state.adDensity = 105;
            state.adPrivacyLevel = corp.id === 'META' ? 'aggressive' : 'balanced';
            state.seoDailyBudget = scale * 30000 + 10000;
        }
        
        // D. 系統整合與授權 (si_services)
        else if (corp.bizModel === 'si_services') {
            state.seniorEngineers = scale * 40 + 15;
            state.licensingActiveClients = scale * 15 + 5;
            state.siBacklog.push({
                id: `SI-Init-${corp.id}`,
                name: '企業級私有化大模型地端部署案',
                value: scale * 8000000 + 5000000,
                daysLeft: 12,
                progress: 0,
                requiredSpeed: scale * 40
            });
        }
    },

    // ==========================================
    // 2. UI 渲染派發 (Render)
    // ==========================================
    renderSoftwareTab(corp, contentArea, isReadOnly) {
        if (!corp.softwareState) this.initAssets(corp);
        let html = `<div class="p-4 bg-black border border-gray-800 rounded crt">`;
        
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        
        // 頂部全域科技扶持法案橫幅 (Startup Shield Plan)
        if (isFirstYearSubsidized) {
            html += `<div class="mb-4 text-xs bg-green-950 bg-opacity-35 p-3 rounded border border-green-700 text-green-400 flex flex-col gap-1 shadow-[0_0_15px_rgba(0,255,0,0.15)] animate-pulse">
                <div class="font-bold flex items-center gap-1.5">🟢 國家數位科技扶持法案生效中 (上市/創立前三個月特別護航)</div>
                <div class="text-xs text-gray-300">※ 享有：每日伺服器折舊與行政人事支出減免 50% 政策補貼。</div>
                <div class="text-xs text-gray-300">※ 享有：研發迭代、病毒式 CAC 營銷或專案擴編經費享 20% 財政減免。</div>
                ${corp.bizModel === 'subscription' ? `<div class="text-xs text-yellow-500 font-bold">※ 特許扶持：已自動注入國家教育雲端訂閱合約，每日保證獲得補貼收益 +$20,000！</div>` : ''}
                ${corp.bizModel === 'ads_platform' ? `<div class="text-xs text-yellow-500 font-bold">※ 特許扶持：已自動注入觀光局全球精準行銷專案，每日保證獲得分成收益 +$15,000！</div>` : ''}
            </div>`;
        }

        // 處於監管調查警告
        if (corp.softwareState.isSuspended) {
            html += `<div class="mb-4 text-xs bg-red-950 bg-opacity-40 p-3 rounded border border-red-500 text-red-500 flex flex-col gap-1 shadow-[0_0_15px_rgba(255,0,0,0.2)] animate-pulse">
                <div class="font-bold flex items-center gap-1.5">🚨 AI 道德與數據隱私監管調查中 (SUSPENDED BY GOVERNMENT)</div>
                <div class="text-xs text-gray-300">※ 警告：公司涉嫌出賣隱私或 AI 道德倫理缺失，遭監管機構強制停牌整頓，每日營收已強行清零！</div>
                <div class="text-xs text-gray-300">※ 處理：必須點擊下方「合規性投資」支付罰金並建立 AI 道德委員會方能立即重啟業務營運！</div>
            </div>`;
        }

        // 根據 business model 進行 UI 分流
        if (corp.bizModel === 'subscription') {
            html += this.renderSubscriptionUI(corp, isReadOnly);
        } else if (corp.bizModel === 'ai_model') {
            html += this.renderAiModelUI(corp, isReadOnly);
        } else if (corp.bizModel === 'ads_platform') {
            html += this.renderAdsPlatformUI(corp, isReadOnly);
        } else if (corp.bizModel === 'si_services') {
            html += this.renderSiServicesUI(corp, isReadOnly);
        }
        
        html += `</div>`;
        contentArea.innerHTML = html;
    },

    // ==========================================
    // 2-A. SaaS 訂閱服務 (subscription) 面板
    // ==========================================
    renderSubscriptionUI(corp, isReadOnly) {
        const state = corp.softwareState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        // 計算 LTV / CAC Ratio
        // LTV = 每個用戶年費 / 流失率
        let annualFee = state.monthlyFee * 12;
        let ltv = state.churnRate > 0 ? (annualFee / state.churnRate) : annualFee * 100;
        let cac = 350; // 基礎獲客成本
        let ltvCacRatio = cac > 0 ? ltv / cac : 0;
        let ratioColor = ltvCacRatio >= 3.0 ? 'text-green-400 font-bold' : 'text-red-500 font-bold animate-pulse';

        let html = `<h3 class="text-cyan font-bold mb-2 text-md flex items-center gap-1">💻 SaaS 訂閱服務 (Subscription) 營運面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">產品即服務 (SaaS)。CEO 必須在「產品迭代」與「訂閱費用」間取得平衡。若調漲月費，流失率會飆升；若迭代太慢，則會累積技術債，推升伺服器維護成本！</p>`;

        // A. 基本資產負債數據
        html += `<div class="grid grid-cols-4 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">總訂閱用戶數</div>
                <div class="text-cyan font-mono font-bold text-xs mt-1">${state.subscribers.toLocaleString()} 人</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">月流失率 (Churn Rate)</div>
                <div class="font-mono font-bold text-xs mt-1 ${state.churnRate > 0.08 ? 'text-red-500 animate-pulse' : 'text-green-400'}">${(state.churnRate * 100).toFixed(2)}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">技術債累計</div>
                <div class="font-mono font-bold text-xs mt-1 ${state.techDebt > 30 ? 'text-yellow animate-pulse' : 'text-gray-400'}">${Math.floor(state.techDebt)}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">LTV / CAC 比值</div>
                <div class="font-mono text-xs mt-1 ${ratioColor}">${ltvCacRatio.toFixed(2)}x</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 訂閱價格與 R&D 研發投入
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">📊 訂閱定價與產品迭代 (SaaS Tuning)</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="text-xs text-gray-400 block">訂閱定價 (目前月費指數):</label>
                        <div class="flex items-center gap-2">
                            <input type="range" min="5" max="50" step="1" value="${state.monthlyFee}"
                                   onchange="CEO_SOFTWARE.changeMonthlyFee('${corp.id}', this.value)"
                                   class="w-2/3 cursor-pointer accent-cyan-500">
                            <span class="text-yellow font-mono font-bold">$${state.monthlyFee}/月</span>
                        </div>
                        <div class="text-xs text-gray-400">※ 調漲月費可立刻增加現有營收，但會導致流失率上升。</div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs text-gray-400 block">每日迭代 R&D 經費:</label>
                        <div class="flex items-center gap-2">
                            <input type="range" min="1000" max="50000" step="1000" value="${state.rdIterDaily}"
                                   onchange="CEO_SOFTWARE.changeRdIter('${corp.id}', this.value)"
                                   class="w-2/3 cursor-pointer accent-cyan-500">
                            <span class="text-green-400 font-mono font-bold">$${app.formatMoney(state.rdIterDaily)}/日</span>
                        </div>
                        <div class="text-xs text-gray-400">※ 產品迭代能大幅清償技術債並降低流失率。</div>
                    </div>
                </div>
            </div>`;

            // C. 病毒式 CAC 營銷推廣
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">📣 病毒式行銷與獲客 (CAC Campaign)</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            let p1 = isFirstYearSubsidized ? 4000000 : 5000000;
            let p2 = isFirstYearSubsidized ? 16000000 : 20000000;

            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <p class="text-xs text-gray-400 mb-3">投入預算直接進行行銷投放。行銷成效與當前 LTV/CAC 比值呈正相關（比值越高，獲客效率越高）。</p>
                <div class="grid grid-cols-2 gap-3">
                    <button ${disabledAttr} onclick="CEO_SOFTWARE.launchCampaign('${corp.id}', ${p1}, 12000)" class="${disabledClass} btn-retro text-left p-2.5 border-cyan text-cyan">
                        <div class="font-bold">📣 小型社群病毒裂變 (-$${app.formatMoney(p1)})</div>
                        <div class="text-xs text-gray-400 mt-1">小試身手，投放精準社群廣告。</div>
                        <div class="text-green-400 font-bold text-xs mt-1">預估新訂閱用戶: +12,000人</div>
                    </button>
                    <button ${disabledAttr} onclick="CEO_SOFTWARE.launchCampaign('${corp.id}', ${p2}, 60000)" class="${disabledClass} btn-retro text-left p-2.5 border-yellow text-yellow">
                        <div class="font-bold">🔥 巨量全網KOL聯名轟炸 (-$${app.formatMoney(p2)})</div>
                        <div class="text-xs text-gray-400 mt-1">重金投放，全網全通路流量引流。</div>
                        <div class="text-green-400 font-bold text-xs mt-1">預估新訂閱用戶: +60,000人</div>
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-B. AI 模型與算力 (ai_model) 面板
    // ==========================================
    renderAiModelUI(corp, isReadOnly) {
        const state = corp.softwareState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        // 計算升級算力費用
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let trainCost = isFirstYearSubsidized ? 32000000 : 40000000;

        let html = `<h3 class="text-purple-400 font-bold mb-2 text-md">🧠 AI 模型訓練與 API 算力 (AI Infra)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">算力即帝國。CEO 可選擇大量現金採購算力訓練下一代模型，解鎖大模型參數等級；同時能決定「開源/閉源」戰略來影響全球社群與自身系統整合業務！</p>`;

        // A. 算力矩陣與模型狀態
        html += `<div class="grid grid-cols-4 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">當前大模型版本</div>
                <div class="text-purple-400 font-mono font-bold text-xs mt-1">${state.modelName} (${state.modelParamLevel}代)</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">每日 Token API 呼叫</div>
                <div class="text-green-400 font-mono font-bold text-xs mt-1">${state.tokenCalls.toLocaleString()} M Token</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">GPU 算力容量 (H100)</div>
                <div class="text-yellow-400 font-mono font-bold text-xs mt-1">${state.gpuComputeCapacity} 台</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">授權發行戰略</div>
                <div class="text-white font-bold text-xs mt-1">${state.isOpenSource ? '🔓 全球開源' : '🔒 商業閉源'}</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 模型研發進度與算力採購
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">🏗️ 大模型算力擴建與訓練 (Training Next-Gen Model)</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <div class="font-bold text-purple-300">大模型訓練進度: <span class="text-yellow">${state.trainingProgress}%</span></div>
                        <div class="text-xs text-gray-400 mt-0.5">累計訓練進度達到 100% 時，模型將自動升級為下一代參數級別，解除收費限制！</div>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SOFTWARE.trainModel('${corp.id}', ${trainCost})" class="${disabledClass} btn-retro text-xs border-purple-500 text-purple-400 font-bold py-1.5 px-4 hover:bg-purple-950 transition">
                        注入訓練資金 -$${app.formatMoney(trainCost)}
                    </button>
                </div>
                <div class="w-full bg-gray-900 rounded-full h-2.5 overflow-hidden">
                    <div class="bg-purple-500 h-2.5 rounded-full transition-all" style="width: ${state.trainingProgress}%"></div>
                </div>
            </div>`;

            // C. API 定價與開閉源模式切換
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">⚖️ API Token 商業定價與生態開源切換</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="text-xs text-gray-400 block">Token API 呼叫單價 (每百萬 Token):</label>
                        <div class="flex items-center gap-2">
                            <input type="range" min="1" max="20" step="1" value="${Math.floor(state.tokenPrice * 1000)}"
                                   ${state.isOpenSource ? 'disabled' : ''}
                                   onchange="CEO_SOFTWARE.changeTokenPrice('${corp.id}', this.value)"
                                   class="w-2/3 cursor-pointer accent-purple-500">
                            <span class="text-yellow font-mono font-bold">$${state.isOpenSource ? '0' : (state.tokenPrice * 1000).toFixed(0)} /M</span>
                        </div>
                        <div class="text-xs text-gray-400">※ 調低價格能吸引大量客戶，但毛利會縮水。開源時價格為 0。</div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs text-gray-400 block">大模型開源與生態戰略選擇:</label>
                        <div class="flex gap-2">
                            <button onclick="CEO_SOFTWARE.toggleOpenSource('${corp.id}', true)" class="btn-retro flex-1 py-1.5 text-xs ${state.isOpenSource ? 'bg-purple-900 text-white font-bold' : 'border-gray-700 text-gray-400'}">
                                🔓 全球開源
                            </button>
                            <button onclick="CEO_SOFTWARE.toggleOpenSource('${corp.id}', false)" class="btn-retro flex-1 py-1.5 text-xs ${!state.isOpenSource ? 'bg-purple-900 text-white font-bold' : 'border-gray-700 text-gray-400'}">
                                🔒 商業閉源
                            </button>
                        </div>
                        <div class="text-xs text-gray-400 mt-1">※ 開源能極速擴張生態圈，使集團旗下或自創的 [系統整合] 業務專案上限增加 50% 且利潤翻倍！</div>
                    </div>
                </div>
            </div>`;

            if (state.isSuspended) {
                html += `<h4 class="text-red-500 font-bold text-xs mb-2 border-l-2 border-red-500 pl-1.5">🚨 監管調查緊急合規救市</h4>
                <div class="bg-red-950 bg-opacity-20 p-3.5 rounded border border-red-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] mb-5 flex justify-between items-center p-3 gap-4">
                    <div>
                        <div class="font-bold text-red-400">建立 AI 道德審查委員會</div>
                        <div class="text-xs text-gray-300 mt-0.5">支付懲罰性罰金 $25,000,000，引進外部合規審查機制以重啟業務。</div>
                    </div>
                    <button onclick="CEO_SOFTWARE.injectEthicCommittee('${corp.id}')" class="btn-retro text-xs border-red-500 text-red-500 font-bold py-2 px-6 hover:bg-red-950 transition">
                        支付罰款並成立道德審核委
                    </button>
                </div>`;
            }
        }

        return html;
    },

    // ==========================================
    // 2-C. 廣告與數據平台 (ads_platform) 面板
    // ==========================================
    renderAdsPlatformUI(corp, isReadOnly) {
        const state = corp.softwareState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-green-400 font-bold mb-2 text-md">📢 廣告投放與用戶數據變現 (Ads & Data)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">數據帝國。CEO 必須在「廣告密度」與「用戶體驗（DAU 留存）」間取得平衡；同時決定數據隱私政策，在暴利變現與反壟斷調查黑天鵝之間進行博弈！</p>`;

        // A. 基本資產負債數據
        html += `<div class="grid grid-cols-4 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">日活躍用戶數 (DAU)</div>
                <div class="text-green-400 font-mono font-bold text-xs mt-1">${state.dau.toLocaleString()} 人</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">廣告密度指數</div>
                <div class="text-yellow-400 font-mono font-bold text-xs mt-1">${state.adDensity}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">用戶反感討厭值</div>
                <div class="font-mono text-xs mt-1 ${state.userAnnoyance > 50 ? 'text-red-500 font-bold animate-pulse' : 'text-gray-400'}">${Math.floor(state.userAnnoyance)}/100</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">隱私隱私與安全政策</div>
                <div class="font-bold text-xs mt-1 ${state.adPrivacyLevel === 'aggressive' ? 'text-red-400 animate-pulse' : (state.adPrivacyLevel === 'balanced' ? 'text-cyan' : 'text-green-400')}">
                    ${state.adPrivacyLevel === 'aggressive' ? '☠️ 激進變現' : (state.adPrivacyLevel === 'balanced' ? '⚖️ 平衡隱私' : '🛡️ 嚴格合規')}
                </div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 廣告密度控制與隱私設定
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">⚖️ 廣告密度與用戶隱私變現控制</h4>`;
            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="text-xs text-gray-400 block">廣告顯示密度指數 (影響廣告密度):</label>
                        <div class="flex items-center gap-2">
                            <input type="range" min="30" max="200" step="5" value="${state.adDensity}"
                                   onchange="CEO_SOFTWARE.changeAdDensity('${corp.id}', this.value)"
                                   class="w-2/3 cursor-pointer accent-green-500">
                            <span class="text-yellow font-mono font-bold">${state.adDensity}%</span>
                        </div>
                        <div class="text-xs text-gray-400">※ 超過 100% 會帶來極高用戶討厭，導致 DAU 流失率加劇！</div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs text-gray-400 block">用戶數據隱私變現戰略:</label>
                        <select onchange="CEO_SOFTWARE.changePrivacyLevel('${corp.id}', this.value)" class="bg-black border border-green-500 text-green-400 text-xs py-1 px-2 w-full outline-none cursor-pointer">
                            <option value="balanced" ${state.adPrivacyLevel === 'balanced' ? 'selected' : ''}>⚖️ 平衡隱私 (常規變現)</option>
                            <option value="aggressive" ${state.adPrivacyLevel === 'aggressive' ? 'selected' : ''}>☠️ 激進變現 (出售數據，精準度+40%，但監管風險暴增5倍)</option>
                            <option value="strictly_compliant" ${state.adPrivacyLevel === 'strictly_compliant' ? 'selected' : ''}>🛡️ 嚴格合規 (隱私至上，精準度-20%，完全免疫道德監管危機)</option>
                        </select>
                    </div>
                </div>
            </div>`;

            // C. SEO 流量池投放與監管重啟
            html += `<div class="grid grid-cols-2 gap-4">
                <div>
                    <h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">🚀 流量池 SEO 被動維護投入</h4>
                    <div class="bg-gray-950 p-3.5 rounded border border-gray-900 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                        <label class="text-xs text-gray-400 block mb-2">每日 SEO 優化維護費:</label>
                        <div class="flex items-center gap-2">
                            <input type="range" min="1000" max="30000" step="1000" value="${state.seoDailyBudget}"
                                   onchange="CEO_SOFTWARE.changeSeoBudget('${corp.id}', this.value)"
                                   class="w-2/3 cursor-pointer accent-green-500">
                            <span class="text-green-400 font-mono font-bold">$${app.formatMoney(state.seoDailyBudget)}/日</span>
                        </div>
                    </div>
                </div>
                
                ${state.isSuspended ? `
                <div>
                    <h4 class="text-red-500 font-bold text-xs mb-2 border-l-2 border-red-500 pl-1.5">🚨 監管調查緊急合規救市</h4>
                    <div class="bg-red-950 bg-opacity-20 p-3.5 rounded border border-red-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] flex flex-col gap-2">
                        <div class="text-xs text-gray-300">支付懲罰性罰金 $25,000,000 並強制成立 AI 道德合規審查委員會以重啟業務。</div>
                        <button onclick="CEO_SOFTWARE.injectEthicCommittee('${corp.id}')" class="btn-retro text-xs border-red-500 text-red-500 font-bold py-2 w-full hover:bg-red-950 transition">
                            支付罰款並成立道德審核委
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-D. 系統整合與軟體授權 (si_services) 面板
    // ==========================================
    renderSiServicesUI(corp, isReadOnly) {
        const state = corp.softwareState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        // 計算同時接案上限 (每 5 名高級工程師可承包一個案子，且隨開源 Buff 加成)
        let groupBuff = 1.0;
        let pStocks = app.state.stocks.filter(s => s.sector === 'software_ai' && s.bizModel === 'ai_model');
        let hasOpenSourceGroupBuff = pStocks.some(s => s.softwareState && s.softwareState.isOpenSource);
        if (hasOpenSourceGroupBuff) groupBuff = 1.5; // 專案上限加成 50%
        
        let maxProjects = Math.max(1, Math.floor((state.seniorEngineers / 5) * groupBuff));

        let html = `<h3 class="text-yellow font-bold mb-2 text-md">💻 系統整合與企業數位轉型 (SI & Licensing)</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">穩健的交付軍團。每個項目皆需要充足的高級工程師顧問。若交付延遲將面臨 30% 賠償；但順利完成後會永久轉化為「年費客戶」，被動收益極大化！</p>`;

        // A. 基本資產負債數據
        html += `<div class="grid grid-cols-4 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">高級顧問工程師 (HR連動)</div>
                <div class="text-yellow-400 font-mono font-bold text-xs mt-1">${state.seniorEngineers} 人</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">同時承接專案上限</div>
                <div class="text-green-400 font-mono font-bold text-xs mt-1">${state.siBacklog.length} / ${maxProjects} 個</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">維護在手授權企業戶</div>
                <div class="text-cyan font-mono font-bold text-xs mt-1">${state.licensingActiveClients} 家</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">軟體年費被動每日收入</div>
                <div class="text-green-400 font-mono font-bold text-xs mt-1">+$${app.formatMoney(state.licensingActiveClients * state.licensingDailyFee)} /日</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 高級工程師擴編
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow pl-1.5">🤝 系統顧問團隊人力編制微操 (顧問招募與年費設定)</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            let recruitCost = isFirstYearSubsidized ? 4000000 : 5000000;

            html += `<div class="bg-gray-950 p-3.5 rounded border border-gray-900 mb-5 text-xs text-gray-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <div class="text-xs text-gray-400">招募 5 位資深系統顧問工程師:</div>
                        <p class="text-xs text-gray-400 mt-1">高級工程師能以多倍速度推展所有承包專案進度，並能解鎖更大的同時接案量。每人月薪將計入每日人事支出。</p>
                    </div>
                    <div class="flex gap-2 items-center justify-end">
                        <button onclick="CEO_SOFTWARE.recruitEngineers('${corp.id}', ${recruitCost})" class="btn-retro text-xs py-2 px-3 border-yellow text-yellow font-bold">
                            擴編招募 +5人 (-$${app.formatMoney(recruitCost)})
                        </button>
                    </div>
                </div>
            </div>`;
        }

        // C. 在手企業專案 Backlog
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow pl-1.5">📋 在手客製化系統整合與 AI 部署合約 (SI Pipeline)</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.siBacklog.length > 0) {
            state.siBacklog.forEach(u => {
                let progressPct = Math.min(100, Math.floor((u.progress / u.requiredSpeed) * 100));
                let daysColor = u.daysLeft <= 3 ? 'text-red-500 font-bold animate-pulse' : 'text-yellow';
                
                html += `<div class="border-b border-gray-900 py-3 last:border-0 text-gray-300">
                    <div class="flex justify-between items-center mb-1">
                        <div>
                            <span class="text-yellow font-bold">${u.name}</span>
                            <span class="text-xs text-gray-400 ml-1">專案總值: $${app.formatMoney(u.value)}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-xs ${daysColor}">剩 ${u.daysLeft} 天交付</span>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        <div class="w-2/3 bg-gray-900 rounded-full h-2 overflow-hidden">
                            <div class="bg-yellow-500 h-2 rounded-full transition-all" style="width: ${progressPct}%"></div>
                        </div>
                        <div class="text-xs text-gray-300">${progressPct}% (${u.progress}/${u.requiredSpeed} 工時)</div>
                        ${!isReadOnly ? `
                            <button onclick="CEO_SOFTWARE.cancelProject('${corp.id}', '${u.id}')" class="btn-retro text-xs px-2 py-0.5 border-red-500 text-red-500 font-bold ml-auto">取消放棄</button>
                        ` : ''}
                    </div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前沒有承接中的系統轉型或地端 AI 微調案件。</div>`;
        }
        html += `</div>`;

        return html;
    },

    // ==========================================
    // 3. 玩家決策操作 (Actions)
    // ==========================================
    
    // SaaS - 調整訂閱月費
    changeMonthlyFee(corpId, val) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.softwareState) return;
        corp.softwareState.monthlyFee = parseInt(val);
        app.log(`【定價調整】SaaS 公司 ${corp.name} 將每月訂閱費調整至: $${val}/月。流失率與獲客 LTV 將重新進行匹配！`, "text-cyan");
        this.refreshSoftwareTabUI(corp);
    },

    // SaaS - 調整 R&D 經費
    changeRdIter(corpId, val) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.softwareState) return;
        corp.softwareState.rdIterDaily = parseInt(val);
        app.log(`【研發調整】${corp.name} 將每日產品迭代 R&D 經費調整為每日 $${app.formatMoney(val)}！這會加強清償技術債並拉高客戶續約率！`, "text-cyan");
        this.refreshSoftwareTabUI(corp);
    },

    // SaaS - 行銷推廣
    launchCampaign(corpId, price, targetUsers) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.softwareState) return;
        
        if (corp.corporateCash >= price) {
            corp.corporateCash -= price;
            
            const state = corp.softwareState;
            // 根據 LTV/CAC 比值進行獲客成效加成
            let annualFee = state.monthlyFee * 12;
            let ltv = state.churnRate > 0 ? (annualFee / state.churnRate) : annualFee * 100;
            let cac = 350;
            let ratio = ltv / cac;
            
            // 係數放大
            let actualAdd = Math.floor(targetUsers * Math.min(2.5, Math.max(0.4, ratio / 3.0)));
            state.subscribers += actualAdd;
            
            app.log(`【行銷裂變成功】🚀 ${corp.name} 砸下 $${app.formatMoney(price)} 廣告經費！結合 ${(ratio).toFixed(1)}x 的 LTV/CAC 獲客漏斗轉化率，成功新增了 ${actualAdd.toLocaleString()} 名活躍訂閱用戶！`, "text-green-400 font-bold");
            this.refreshSoftwareTabUI(corp);
        } else {
            app.log("【流動性不足】金控現金不足，無法發動該規模之行銷預算！", "text-red-500");
        }
    },

    // AI - 算力訓練
    trainModel(corpId, price) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.softwareState) return;
        
        if (corp.corporateCash >= price) {
            corp.corporateCash -= price;
            const state = corp.softwareState;
            
            // 檢查半導體先進晶片 Buff 算力加成 (10%)
            let speedBuff = 1.0;
            let semiStocks = app.state.stocks.filter(s => s.sector === 'semi');
            let hasAdvancedSemiYield = semiStocks.some(s => s.semiState && s.semiState.isLithoUpgraded);
            if (hasAdvancedSemiYield) speedBuff = 1.2; // 訓練進度加速 20%
            
            let addProgress = Math.floor((30 + Math.random() * 20) * speedBuff);
            state.trainingProgress += addProgress;
            
            let semiMsg = hasAdvancedSemiYield ? " (偵測到下游先進晶片算力 Buff +20% 加速)" : "";
            app.log(`【大模型訓練】🧠 ${corp.name} 採購 GPU 算力機台注入 $${app.formatMoney(price)}${semiMsg}！模型訓練進度推進 +${addProgress}% (目前總進度: ${state.trainingProgress}%)！`, "text-purple-400 font-bold");
            
            if (state.trainingProgress >= 100) {
                state.trainingProgress = 0;
                state.modelParamLevel++;
                state.modelName = `GPT-${state.modelParamLevel}`;
                state.tokenCalls = state.tokenCalls * 2.2; // 調用容量暴增
                state.gpuComputeCapacity = Math.floor(state.gpuComputeCapacity * 1.5);
                app.log(`【🏆 重磅技術史詩級突破】狂賀！${corp.name} 完成了全新的第 ${state.modelParamLevel} 代巨量參數大模型 [${state.modelName}] 的訓練與解盲！全球調用量暴升，Token 收費限制全面解放！`, "text-green-400 font-bold animate-pulse");
            }
            this.refreshSoftwareTabUI(corp);
        } else {
            app.log("【算力金不足】金控現金不足以採購高規格 GPU 算力機房！", "text-red-500");
        }
    },

    // AI - Token 定價
    changeTokenPrice(corpId, val) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.softwareState) return;
        corp.softwareState.tokenPrice = parseFloat(val) / 1000;
        app.log(`【API調價】${corp.name} 將每百萬 Token API 定價調整至: $${val}/M Token！`, "text-purple-400");
        this.refreshSoftwareTabUI(corp);
    },

    // AI - 開開源切換
    toggleOpenSource(corpId, val) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.softwareState) return;
        
        corp.softwareState.isOpenSource = val;
        if (val) {
            app.log(`【大模型全球開源】🔓 ${corp.name} 宣示將其核心大模型對全球開源！API 調用分成降至 0。全球軟體開發者群起歡呼，這將極大化激活全市場 [系統整合 (si_services)] 專案的上線！`, "text-green-400 font-bold");
        } else {
            app.log(`【大模型收歸閉源】🔒 ${corp.name} 將下一代模型收歸為商業閉源！重啟 API 流量收費分成，恢復商業利潤最大化。`, "text-yellow font-bold");
        }
        this.refreshSoftwareTabUI(corp);
    },

    // Ads - 廣告密度
    changeAdDensity(corpId, val) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.softwareState) return;
        corp.softwareState.adDensity = parseInt(val);
        app.log(`【廣告顯示微操】${corp.name} 廣告顯示密度調整至: ${val}%！這會提高每日 CPM 廣告費分成，但也將拉高用戶的反感厭惡值！`, "text-green-400");
        this.refreshSoftwareTabUI(corp);
    },

    // Ads - 隱私合規政策
    changePrivacyLevel(corpId, val) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.softwareState) return;
        
        corp.softwareState.adPrivacyLevel = val;
        const msg = {
            balanced: "⚖️ 平衡隱私政策。常規數據採集與廣告投放。",
            aggressive: "☠️ 激進數據變現！精準度翻倍，CPM 營收大增 40%，但面臨道德監管調查風險將暴增 5 倍！",
            strictly_compliant: "🛡️ 嚴格隱私合規。完全保障用戶隱私，CPM 營收下降 20%，但完全免疫 AI 道德危機與數據監管調查！"
        };
        app.log(`【隱私政策調整】${corp.name} 調整數據隱私政策為: ${msg[val]}`, "text-green-400 font-bold");
        this.refreshSoftwareTabUI(corp);
    },

    // Ads - SEO 被動維護
    changeSeoBudget(corpId, val) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.softwareState) return;
        corp.softwareState.seoDailyBudget = parseInt(val);
        app.log(`【流量預算調整】${corp.name} 將每日 SEO 流量維護支出調整為: $${app.formatMoney(val)}/日！`, "text-green-400");
        this.refreshSoftwareTabUI(corp);
    },

    // Ads - 監管重啟道德委
    injectEthicCommittee(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.softwareState) return;
        
        const price = 25000000;
        if (corp.corporateCash >= price) {
            corp.corporateCash -= price;
            corp.softwareState.isSuspended = false;
            corp.softwareState.hasEthicCommittee = true;
            app.log(`【救市與合規投資成功】🛡️ ${corp.name} 繳清 $25,000,000 國家罰款並建立「AI 倫理與道德委員會」！數據調查全面結束，業務重新啟動變現！`, "text-green-400 font-bold animate-pulse");
            this.refreshSoftwareTabUI(corp);
        } else {
            app.log("【流動性不足】金控可用現金不足，無法繳納 $25M 罰金！請速變賣資產或發行增資案籌資！", "text-red-500 font-bold");
        }
    },

    // SI - 招募顧問工程師
    recruitEngineers(corpId, price) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.softwareState) return;
        
        if (corp.corporateCash >= price) {
            corp.corporateCash -= price;
            corp.softwareState.seniorEngineers += 5;
            app.log(`【高級顧問擴編】🤝 ${corp.name} 成功擴編招攬 5 名高級工程師顧問團隊！這將加快專案承包時效，並倍增接案容量上限！`, "text-yellow font-bold");
            this.refreshSoftwareTabUI(corp);
        } else {
            app.log("【招募資金不足】金控現金不足以招聘高級工程師！", "text-red-500");
        }
    },

    // SI - 放棄專案
    cancelProject(corpId, uid) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.softwareState) return;
        
        const state = corp.softwareState;
        const uIdx = state.siBacklog.findIndex(x => x.id === uid);
        if (uIdx === -1) return;

        if (!confirm("【警告】強行中止該企業系統整合案會被視為違約，需賠償專案總價值 30% 違約金！確認取消嗎？")) {
            return;
        }

        let penalty = Math.floor(state.siBacklog[uIdx].value * 0.3);
        corp.corporateCash = Math.max(0, corp.corporateCash - penalty);
        corp.monthExpense = (corp.monthExpense || 0) + penalty;
        state.siBacklog.splice(uIdx, 1);
        app.log(`【中止交付】${corp.name} 強行中止了系統整合項目，支付違約金 -$${app.formatMoney(penalty)}。`, "text-red-500");
        this.refreshSoftwareTabUI(corp);
    },

    // ==========================================
    // 4. 每日營收與 Feedback Loop 結算 (Process Revenue)
    // ==========================================
    processRevenue(corp) {
        if (!corp.softwareState) this.initAssets(corp);
        const state = corp.softwareState;

        // 【全方位防禦性安全性保護】防範任何 undefined 或 NaN 造成的數學運算崩潰與 NaN 污染
        state.techDebt = Math.max(0, Math.min(100, Number(state.techDebt) || 0));
        state.hasEthicCommittee = !!state.hasEthicCommittee;
        state.isSuspended = !!state.isSuspended;
        state.regulationDaysLeft = Number(state.regulationDaysLeft) || 0;

        state.subscribers = Number(state.subscribers) || 0;
        state.monthlyFee = Number(state.monthlyFee) || 15;
        state.churnRate = Number(state.churnRate) || 0.05;
        state.rdIterDaily = Number(state.rdIterDaily) || 8000;
        state.cacBudget = Number(state.cacBudget) || 0;

        state.modelParamLevel = Number(state.modelParamLevel) || 1;
        state.modelName = state.modelName || 'GPT-1';
        state.isOpenSource = !!state.isOpenSource;
        state.tokenPrice = Number(state.tokenPrice) || 0.005;
        state.tokenCalls = Number(state.tokenCalls) || 0;
        state.gpuComputeCapacity = Number(state.gpuComputeCapacity) || 100;
        state.trainingProgress = Number(state.trainingProgress) || 0;

        state.dau = Number(state.dau) || 0;
        state.adDensity = Number(state.adDensity) || 100;
        state.seoDailyBudget = Number(state.seoDailyBudget) || 5000;
        state.adPrivacyLevel = state.adPrivacyLevel || 'balanced';
        state.userAnnoyance = Number(state.userAnnoyance) || 0;

        state.seniorEngineers = Number(state.seniorEngineers) || 0;
        state.deliverySpeed = Number(state.deliverySpeed) || 1.0;
        state.licensingActiveClients = Number(state.licensingActiveClients) || 0;
        state.licensingDailyFee = Number(state.licensingDailyFee) || 600;
        state.siBacklog = state.siBacklog || [];

        let dailyRev = 0;
        let dailyExp = 0;
        
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);

        // 如果被停牌整頓，每日營收強制清零，只扣伺服器折舊與工程師人事
        if (state.isSuspended) {
            let baseExp = 15000 + (state.seniorEngineers * 1200);
            dailyExp = isFirstYearSubsidized ? Math.floor(baseExp * 0.5) : baseExp;
            dailyRev = 0;
        }
        // --- A. SaaS 訂閱服務 (subscription) 結算 ---
        else if (corp.bizModel === 'subscription') {
            // 基礎伺服器運維與人事
            let baseServerCost = 20000;
            // 技術債對維護費的負累加成 (每10%技術債增加15%維護費)
            let debtPenaltyMultiplier = 1.0 + (state.techDebt / 10) * 0.15;
            dailyExp += baseServerCost * debtPenaltyMultiplier;

            // R&D 迭代費用
            dailyExp += state.rdIterDaily;

            // 結算每日訂閱營收 (訂閱戶 * 訂閱單價 / 30)
            let subRev = (state.subscribers * state.monthlyFee) / 30;
            dailyRev += subRev;

            // 流失率動態變更
            // 價格定高了流失率上升，R&D 研發降低流失率，技術債推高流失率
            let baseChurn = 0.03;
            let priceDiff = (state.monthlyFee - 15) / 15 * 0.05; // 每超過基準價格一倍增加 5% Churn
            let rdDiscount = (state.rdIterDaily / 10000) * 0.015; // 每1萬日研發減少 1.5% Churn
            let debtPenaltyChurn = (state.techDebt / 10) * 0.01;   // 每10%技術債增加 1% Churn
            
            // 網信 (telecom) 板塊連動 (大頻寬 Buff 降低流失率)
            let teleSect = app.state.stocks.filter(x => x.sector === 'telecom');
            let teleBuff = teleSect.length > 0 && teleSect.every(x => x.price > x.basePrice * 1.10) ? 0.01 : 0;

            state.churnRate = Math.max(0.01, Math.min(0.25, baseChurn + priceDiff + debtPenaltyChurn - rdDiscount - teleBuff));

            // 技術債累積判定
            // 如果每日迭代費用低於 $8,000，技術債會緩步上升；高於則緩步清除
            if (state.rdIterDaily < 8000) {
                state.techDebt = Math.min(100, state.techDebt + 0.35);
            } else {
                state.techDebt = Math.max(0, state.techDebt - (state.rdIterDaily / 10000) * 0.2);
            }

            // 用戶增長/流失波動
            let churnedUsers = state.subscribers * (state.churnRate / 30);
            let organicAdd = state.subscribers * 0.0015; // 被動有機增長
            state.subscribers = Math.max(100, Math.floor(state.subscribers - churnedUsers + organicAdd));

            // [特許種子補貼] 國家教育雲端採購日收益補貼
            if (isFirstYearSubsidized) {
                dailyRev += 20000;
            }

            // 隨機日誌
            if (corp.isPlayerFounded && state.techDebt > 40 && Math.random() < 0.05) {
                app.log(`【技術債黑洞】⚠️ SaaS 公司 ${corp.name} 因研發投入不足導致技術債累積至 ${Math.floor(state.techDebt)}%！伺服器維護費上升 ${( (debtPenaltyMultiplier-1)*100 ).toFixed(0)}%！`, "text-yellow");
            }
        }
        
        // --- B. AI 模型與算力 (ai_model) 結算 ---
        else if (corp.bizModel === 'ai_model') {
            // GPU 算力機房折舊與每日高昂電費
            let powerCost = state.gpuComputeCapacity * 350; // 每台 GPU 每日 $350 折舊與能耗
            dailyExp += powerCost;

            // API 調用利潤 (百萬次 Token * Token 單價)
            if (!state.isOpenSource) {
                let apiRev = state.tokenCalls * state.tokenPrice * 1000;
                dailyRev += apiRev;
            }

            // 開閉源戰略的流量影響與外溢效應
            if (state.isOpenSource) {
                // 開源吸引海量開發者，API 呼叫數翻 3 倍，但不收費，改為 SI 連動
                state.tokenCalls = Math.min(state.gpuComputeCapacity * 5, state.tokenCalls + 15);
            } else {
                // 閉源受限，調用量受價格與參數等級 (模型代數) 共同影響
                let baseDemand = state.gpuComputeCapacity * 1.5;
                let levelMult = state.modelParamLevel * 0.5 + 0.5;
                let priceMult = 0.005 / state.tokenPrice; // Token 價格越便宜需求越高
                
                state.tokenCalls = Math.min(state.gpuComputeCapacity * 3, Math.floor(baseDemand * levelMult * priceMult));
            }

            // [特許大額算力補貼]
            // 第一年算力機電成本折半
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
            }

            // AI 道德危機監管抽查 (激進隱私政策會極大拉高此機率)
            let regulationProb = 0.002;
            let adsComps = app.state.stocks.filter(x => x.sector === 'software_ai' && x.bizModel === 'ads_platform');
            let isAnyAdsAggressive = adsComps.some(s => s.softwareState && s.softwareState.adPrivacyLevel === 'aggressive');
            if (isAnyAdsAggressive) regulationProb = 0.01;

            if (corp.isPlayerFounded && !state.hasEthicCommittee && Math.random() < regulationProb) {
                state.isSuspended = true;
                app.log(`【🚨 國家 AI 道德合規反壟斷調查】監管重擊！${corp.name} 因未設立道德合規委員會且數據與大模型演算道德遭到社會輿論強烈質疑，被金管會與數位部下令「即刻停牌整頓」，每日業務全面暫停！`, "text-red-500 font-bold animate-pulse");
            }
        }
        
        // --- C. 廣告與數據平台 (ads_platform) 結算 ---
        else if (corp.bizModel === 'ads_platform') {
            // SEO 流量維護支出
            dailyExp += state.seoDailyBudget;
            dailyExp += 10000; // 行政支出

            // 結算每日 CPM 廣告分成
            // 基礎 CPM 隨零售 (retail) 及遊戲 (game) 板塊熱度波動
            let gameSect = app.state.stocks.filter(x => x.sector === 'game');
            let isGameBooming = gameSect.length > 0 && gameSect.every(x => x.price > x.basePrice * 1.10);
            
            let baseCpm = isGameBooming ? 25 : 18; // 遊戲大爆發時 CPM 廣告費大漲 40%
            let precisionMult = state.adPrivacyLevel === 'aggressive' ? 1.4 : (state.adPrivacyLevel === 'strictly_compliant' ? 0.8 : 1.0);
            let densityMult = state.adDensity / 100;

            let adRev = (state.dau * (state.adDensity / 100) * baseCpm * precisionMult) / 1000;
            dailyRev += adRev;

            // 用戶討厭值與 DAU 增減動態
            if (state.adDensity > 100) {
                state.userAnnoyance = Math.min(100, state.userAnnoyance + (state.adDensity - 100) * 0.05);
            } else {
                state.userAnnoyance = Math.max(0, state.userAnnoyance - 0.5);
            }

            // DAU 自然流失率與 SEO 補齊
            let annoyanceLoss = state.dau * (state.userAnnoyance / 100) * 0.01;
            let seoAdd = (state.seoDailyBudget / 5000) * 800; // 5k 預算引流 800 人
            state.dau = Math.max(5000, Math.floor(state.dau - annoyanceLoss + seoAdd));

            // [特許種子補貼] 國家精精準推廣日收益補貼
            if (isFirstYearSubsidized) {
                dailyRev += 15000;
            }

            // 隱私風暴隨機事件 (僅激進變現會觸發)
            if (corp.isPlayerFounded && state.adPrivacyLevel === 'aggressive' && !state.hasEthicCommittee && Math.random() < 0.008) {
                state.isSuspended = true;
                app.log(`【🚨 用戶隱私洩露重大醜聞】社會公憤！${corp.name} 被披露將大量用戶隱私行為數據打包出售給黑市營銷商，遭到網信辦與消基會聯合調查並勒令「即刻停牌整頓」！`, "text-red-500 font-bold animate-pulse");
            }
        }
        
        // --- D. 系統整合與授權 (si_services) 結算 ---
        else if (corp.bizModel === 'si_services') {
            // 高級工程師高昂月薪人事費
            let engSalary = state.seniorEngineers * 1200; // 每位工程師每日折算人事費 $1200
            dailyExp += engSalary;

            // 結算穩健的被動授權維護分成
            let licensingRev = state.licensingActiveClients * state.licensingDailyFee;
            dailyRev += licensingRev;

            // 推進 Backlog 在手合約進度
            let totalComputeSpeed = state.seniorEngineers * 5; // 每名工程師每日貢獻 5 個工時
            
            for (let i = state.siBacklog.length - 1; i >= 0; i--) {
                let p = state.siBacklog[i];
                p.daysLeft--;
                
                // 每日工時注入
                p.progress += Math.floor(totalComputeSpeed / state.siBacklog.length);

                if (p.progress >= p.requiredSpeed) {
                    // 順利完美交付，認列全額合約專案營收
                    dailyRev += p.value;
                    state.licensingActiveClients++; // 客戶數永久 +1，被動年費增加！
                    app.log(`【SI 專案交付大功告成】🏆 賀！${corp.name} 順利交付專案合約 [${p.name}]！全額認列專案營收 +$${app.formatMoney(p.value)}！該企業永久轉化為公司的授權維護客戶，年費池擴張！`, "text-green-400 font-bold animate-pulse");
                    state.siBacklog.splice(i, 1);
                } else if (p.daysLeft <= 0) {
                    // 超期違約賠償 (扣 30% 專案價值)
                    let penalty = Math.floor(p.value * 0.3);
                    dailyExp += penalty;
                    app.log(`【💥 SI 交付嚴重逾期違約】噩耗！${corp.name} 承包的專案 [${p.name}] 由於工程師顧問調度不足導致工期严重延誤！被迫支付 30% 的巨額違約金 -$${app.formatMoney(penalty)}！專案遭強制收回終止！`, "text-red-500 font-bold animate-pulse");
                    state.siBacklog.splice(i, 1);
                }
            }

            // 新創首年人事減免 50%
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
            }

            // 隨機在背景生成新的企業數位轉型客製化專案
            let newProjectProb = 0.005;
            // 偵測大模型開源 Buff 加成：若同集團或玩家旗下 AI 大模型是「開源模式」，生成機率翻 5 倍，且利潤暴增！
            let pStocks = app.state.stocks.filter(s => s.sector === 'software_ai' && s.bizModel === 'ai_model');
            let openSourceBuff = pStocks.some(s => s.softwareState && s.softwareState.isOpenSource);
            if (openSourceBuff) newProjectProb = 0.025;

            let groupBuff = openSourceBuff ? 1.5 : 1.0;
            let maxProjects = Math.max(1, Math.floor((state.seniorEngineers / 5) * groupBuff));

            if (state.siBacklog.length < maxProjects && Math.random() < newProjectProb) {
                this.triggerNewSiContract(corp, openSourceBuff);
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

    // 隨機觸發新的系統轉型/AI 微調合約
    triggerNewSiContract(corp, hasOpenSourceBuff) {
        const state = corp.softwareState;
        const clients = ['長榮航運', '富邦金控', '微星電腦', '統一企業', '欣興電子', '合康醫療'];
        const client = clients[Math.floor(Math.random() * clients.length)];
        
        let val = 6000000 + Math.random() * 12000000;
        let speed = 60 + Math.random() * 80;
        let name = `${client} 內部數據 ERP 雲端備援遷移案`;

        if (hasOpenSourceBuff) {
            val = val * 2.2; // 開源加成利潤翻倍
            speed = speed * 1.5;
            name = `${client} 開源 AI 大語言模型私有化部署微調案`;
        }

        state.siBacklog.push({
            id: `SI-${Date.now()}`,
            name: name,
            value: Math.floor(val),
            daysLeft: 14,
            progress: 0,
            requiredSpeed: Math.floor(speed)
        });

        let openSourceMsg = hasOpenSourceBuff ? " (受惠於大模型全球開源紅利，專案價值與利潤翻倍！)" : "";
        app.log(`【專案招標成功】📡 ${corp.name} 系統整合顧問團隊承包了一筆 [${client}] 委託之「${name}」！合約金額 $${app.formatMoney(val)}${openSourceMsg}，立即進駐研發！`, "text-yellow font-bold");
        this.refreshSoftwareTabUI(corp);
    },

    // ==========================================
    // 5. UI 重新整理防護 (Refresh & Cash Update)
    // ==========================================
    refreshSoftwareTabUI(corp) {
        const contentArea = document.getElementById('ops-tab-content');
        if (contentArea) {
            this.renderSoftwareTab(corp, contentArea, false);
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

window.CEO_SOFTWARE = CEO_SOFTWARE;
