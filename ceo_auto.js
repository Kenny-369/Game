// ceo_auto.js - 汽車與重工板塊 CEO 核心營運與 19 家大廠專屬客製化生產系統
(function() {
    const CEO_AUTO = {
        // 1. 初始化資產數據 (包含玩家創立與非玩家上市企業)
        initAssets(corp) {
            if (!corp) return;

            // 確保基本編制
            if (corp.workerCount === undefined || isNaN(corp.workerCount)) {
                corp.workerCount = 200;
            }

            // 防 NaN 機制
            if (corp.corporateCash === undefined || isNaN(corp.corporateCash)) {
                corp.corporateCash = corp.initialCapital || 5000000;
            }

            // 玩家創立之企業，初創時 subModel 預設為 'generic'，待核心經營頁面進行二次細分選擇
            if (corp.isPlayerFounded && corp.subModel === undefined) {
                corp.subModel = 'generic';
                corp.customProduct = '未指定特化生產線，請至核心營運頁面配置。';
            }

            // 確保汽車重工板塊的三大品牌與技術研發指標初始化 (安全防錯)
            if (corp.brandReputation === undefined || isNaN(corp.brandReputation) ||
                corp.techStandard === undefined || isNaN(corp.techStandard) ||
                corp.luxuryValue === undefined || isNaN(corp.luxuryValue)) {
                
                if (corp.isPlayerFounded) {
                    // 玩家創立的公司強制從最底層零點起步，無涉資本規模影響 (大眾聲譽 10 / 技術 1.0 / 奢華 10)
                    corp.brandReputation = 10;
                    corp.techStandard = 1.0;
                    corp.luxuryValue = 10;
                } else {
                    // 非玩家自創之公司，依據大廠 ID 配置高保真初始值 (為收購與控股提供極高的戰略資產價值)
                    const id = corp.id;
                    if (id === '7203') { // Toyota 豐田
                        corp.brandReputation = 90; corp.techStandard = 7.5; corp.luxuryValue = 40;
                    } else if (id === 'TSLA') { // Tesla 特斯拉
                        corp.brandReputation = 85; corp.techStandard = 9.0; corp.luxuryValue = 55;
                    } else if (id === 'RACE') { // Ferrari 法拉利
                        corp.brandReputation = 88; corp.techStandard = 8.0; corp.luxuryValue = 98;
                    } else if (id === 'BMW') { // BMW
                        corp.brandReputation = 82; corp.techStandard = 7.8; corp.luxuryValue = 70;
                    } else if (id === '1211') { // BYD 比亞迪
                        corp.brandReputation = 80; corp.techStandard = 8.2; corp.luxuryValue = 40;
                    } else if (id === 'VOW3') { // Volkswagen 福斯
                        corp.brandReputation = 82; corp.techStandard = 7.2; corp.luxuryValue = 40;
                    } else if (id === 'HMC') { // Honda 本田
                        corp.brandReputation = 80; corp.techStandard = 7.0; corp.luxuryValue = 30;
                    } else if (id === 'GM' || id === 'F') { // GM 通用 / Ford 福特
                        corp.brandReputation = 75; corp.techStandard = 6.8; corp.luxuryValue = 35;
                    } else if (id === '2207') { // 和泰車
                        corp.brandReputation = 85; corp.techStandard = 6.0; corp.luxuryValue = 50;
                    } else if (id === '2201') { // 裕隆
                        corp.brandReputation = 60; corp.techStandard = 4.5; corp.luxuryValue = 20;
                    } else if (id === '2204' || id === '2206') { // 中華車 / 三陽工業
                        corp.brandReputation = 62; corp.techStandard = 4.8; corp.luxuryValue = 20;
                    } else if (id === '2634') { // 漢翔航太
                        corp.brandReputation = 70; corp.techStandard = 8.5; corp.luxuryValue = 30;
                    } else if (id === '9921' || id === '9914') { // 巨大捷安特 / 美利達
                        corp.brandReputation = 78; corp.techStandard = 6.5; corp.luxuryValue = 60;
                    } else if (id === '6605') { // 帝寶車燈
                        corp.brandReputation = 75; corp.techStandard = 5.5; corp.luxuryValue = 25;
                    } else if (id === '1536') { // 和大齒輪
                        corp.brandReputation = 72; corp.techStandard = 6.0; corp.luxuryValue = 25;
                    } else if (id === '2231') { // 為升電子
                        corp.brandReputation = 70; corp.techStandard = 6.5; corp.luxuryValue = 25;
                    } else {
                        // 其餘非特定大廠公司套用初始規模換算公式 (資本雄厚之 AI 新星起步優勢)
                        const cap = corp.initialCapital || corp.corporateCash || 5000000;
                        corp.brandReputation = Math.max(10, Math.min(60, Math.floor(10 + (cap / 10000000) * 10)));
                        corp.techStandard = Math.max(1.0, Math.min(5.0, parseFloat((1.0 + (cap / 15000000) * 1.2).toFixed(1))));
                        corp.luxuryValue = Math.max(10, Math.min(50, Math.floor(10 + (cap / 12000000) * 8)));
                    }
                }
            }

            // 根據 bizModel 初始化特色變數
            if (corp.bizModel === 'legacy_oem') {
                corp.evRatio = corp.evRatio !== undefined ? corp.evRatio : 0.1; // 預設 10% 電車
                corp.inventoryDays = corp.inventoryDays !== undefined ? corp.inventoryDays : 25; // 預設 25 天庫存
                corp.dealerSubsidy = corp.dealerSubsidy !== undefined ? corp.dealerSubsidy : 0; // % 補貼
                corp.carbonTaxFines = 0;
            } 
            else if (corp.bizModel === 'ev_innovator') {
                corp.gigaFactories = corp.gigaFactories !== undefined ? corp.gigaFactories : 1; // 預設 1 座超級工廠
                corp.fsdPrice = corp.fsdPrice !== undefined ? corp.fsdPrice : 250000; // FSD 軟體售價 (25萬)
                corp.fsdPenetration = corp.fsdPenetration !== undefined ? corp.fsdPenetration : 0.05; // 預設 5% 滲透率
                corp.isPriceWar = corp.isPriceWar !== undefined ? corp.isPriceWar : false; // 是否發動降價焦土戰
            } 
            else if (corp.bizModel === 'tier1_am') {
                corp.oemContracts = corp.oemContracts !== undefined ? corp.oemContracts : 1; // 預設 1 個 OEM 大廠長約
                corp.amMolds = corp.amMolds !== undefined ? corp.amMolds : 2; // 預設開發 2 套 AM 碰撞件模具
                corp.lawsuitRisk = corp.lawsuitRisk !== undefined ? corp.lawsuitRisk : 0.05; // 5% 初始專利訴訟風險
                corp.oemCostDownYears = 0;
            } 
            else if (corp.bizModel === 'specialty_heavy') {
                // 專門為特種車與重工定製的初始化
                if (corp.id === 'RACE' || corp.subModel === 'heavy_supercar') { // Ferrari 超跑
                    corp.scarcityQuota = corp.scarcityQuota !== undefined ? corp.scarcityQuota : 499; // 限量 499 台
                    corp.brandScarcity = 1.0; // 信仰稀缺性溢價
                } else if (corp.id === '2634' || corp.subModel === 'heavy_defense') { // 漢翔國防
                    corp.defenseTenderDays = corp.defenseTenderDays !== undefined ? corp.defenseTenderDays : 0; // 剩餘特許天數
                    corp.rndDepth = corp.rndDepth !== undefined ? corp.rndDepth : 1; // 國防特種研發深度
                } else { // 巨大/美利達 或 自行車
                    corp.ebikeRndLevel = corp.ebikeRndLevel !== undefined ? corp.ebikeRndLevel : 1; // E-Bike 研發等級
                    corp.inventoryDays = corp.inventoryDays !== undefined ? corp.inventoryDays : 30; // 自行車經銷商庫存
                }
            }
        },

        // 2. 渲染核心經營面板
        renderAutoTab(corp, container, isReadOnly) {
            if (!corp || !container) return;

            // 再次防 NaN 與初始化
            this.initAssets(corp);

            // 1. 如果是玩家創立的公司，且 subModel 還在 'generic'，先渲染二次細分選項面板
            if (corp.isPlayerFounded && corp.subModel === 'generic') {
                this.renderSecondarySelectionUI(corp, container);
                return;
            }

            let productDesc = corp.customProduct || "客製化汽車重工精密生產線";

            // 唯讀橫幅
            const readOnlyBanner = isReadOnly ? `
                <div class="bg-red-950 border border-red-800 text-red-400 px-4 py-2 text-xs rounded mb-4 text-center">
                    ⚠️ <b>委託經營中</b>：您目前僅持有該公司股份，尚未取得控股權（需持股 >= 50% 或發動委託書大戰奪權），目前僅能檢視其客製化生產狀態。
                </div>
            ` : '';

            // 共用 CSS 樣式與客製化產品卡片
            let html = `
                ${readOnlyBanner}
                <div class="space-y-4 text-gray-200">
                    <!-- 客製化產品發光卡片 -->
                    <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-80 shadow-[0_0_15px_rgba(255,255,255,0.05)] rounded-lg relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-slate-800 bg-opacity-20 rounded-full blur-2xl pointer-events-none"></div>
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <span class="text-xs text-yellow-500 font-semibold tracking-wider uppercase">🏢 專屬客製化生產線</span>
                                <h3 class="text-xl text-white font-extrabold tracking-wide mt-1">${corp.name} <span class="text-xs text-slate-400 font-normal">(${corp.id})</span></h3>
                            </div>
                            <div class="text-right">
                                <span class="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded">
                                    ${this.getBizModelName(corp.bizModel)}
                                </span>
                            </div>
                        </div>
                        <div class="border-t border-slate-800 pt-3 mt-2">
                            <div class="text-sm text-slate-400">目前生產線品項：</div>
                            <div class="text-base text-yellow-400 font-bold mt-1 tracking-wide flex items-center gap-2">
                                🛠️ ${productDesc}
                            </div>
                            <div class="text-xs text-slate-500 mt-2">
                                該生產線的每日產量與毛利率將與您的 CEO 決策與外部油價、利率和降價戰狀態產生深刻因果連動。
                            </div>
                        </div>
                    </div>
            `;

            // 2. 為所有控股或檢視的汽車重工企業渲染精美的三大指標進度卡 (無論是否玩家自創，皆能精確展現品牌實力)
            html += `
                <!-- 品牌成長與技術研發進度面板 -->
                <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-80 shadow-[0_0_15px_rgba(255,255,255,0.05)] rounded-lg relative overflow-hidden">
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-xs text-cyan-400 font-semibold tracking-wider uppercase">📈 品牌成長與技術研發指標</span>
                        <span class="text-[10px] text-slate-500">指標將直接折算影響每日結算收益與長約資格</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- 品牌聲譽 -->
                        <div class="bg-slate-950 p-2.5 rounded border border-slate-800">
                            <div class="flex justify-between text-xs mb-1">
                                <span class="text-yellow-400 font-bold">📢 品牌聲譽值 (Reputation)</span>
                                <span class="text-yellow-400 font-bold">${corp.brandReputation || 10}/100</span>
                            </div>
                            <div class="w-full bg-slate-900 h-2 rounded overflow-hidden border border-slate-800">
                                <div class="h-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" style="width: ${corp.brandReputation || 10}%"></div>
                            </div>
                            <div class="text-[10px] text-slate-500 mt-1">影響大眾買氣：目前大眾銷售折算率為 <span class="text-yellow-400 font-bold">${corp.brandReputation || 10}%</span></div>
                        </div>
                        
                        <!-- 技術標準 -->
                        <div class="bg-slate-950 p-2.5 rounded border border-slate-800">
                            <div class="flex justify-between text-xs mb-1">
                                <span class="text-cyan-400 font-bold">🔬 技術研發標準 (Tech)</span>
                                <span class="text-cyan-400 font-bold">${(corp.techStandard || 1.0).toFixed(1)}/10.0</span>
                            </div>
                            <div class="w-full bg-slate-900 h-2 rounded overflow-hidden border border-slate-800">
                                <div class="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" style="width: ${(corp.techStandard || 1.0) * 10}%"></div>
                            </div>
                            <div class="text-[10px] text-slate-500 mt-1">
                                長約門檻：可爭取至第 <span class="text-cyan-400 font-bold">${Math.floor((corp.techStandard || 1.0) / 3)}</span> 個 OEM 長約；
                                FSD 訂閱天花板：<span class="text-cyan-400 font-bold">${((corp.techStandard || 1.0) * 10).toFixed(0)}%</span>
                            </div>
                        </div>
                        
                        <!-- 產品奢華 -->
                        <div class="bg-slate-950 p-2.5 rounded border border-slate-800">
                            <div class="flex justify-between text-xs mb-1">
                                <span class="text-magenta font-bold">💎 產品奢華價值 (Luxury)</span>
                                <span class="text-magenta font-bold">${corp.luxuryValue || 10}/100</span>
                            </div>
                            <div class="w-full bg-slate-900 h-2 rounded overflow-hidden border border-slate-800">
                                <div class="h-full bg-magenta shadow-[0_0_8px_rgba(217,70,239,0.5)]" style="width: ${corp.luxuryValue || 10}%"></div>
                            </div>
                            <div class="text-[10px] text-slate-500 mt-1">影響富豪買單率：目前奢華信仰折算率為 <span class="text-magenta font-bold">${corp.luxuryValue || 10}%</span></div>
                        </div>
                    </div>
                </div>
            `;

            // 根據 bizModel 渲染專屬操作台
            if (corp.bizModel === 'legacy_oem') {
                html += this.renderLegacyOemUI(corp, isReadOnly);
            } 
            else if (corp.bizModel === 'ev_innovator') {
                html += this.renderEvInnovatorUI(corp, isReadOnly);
            } 
            else if (corp.bizModel === 'tier1_am') {
                html += this.renderTier1AmUI(corp, isReadOnly);
            } 
            else if (corp.bizModel === 'specialty_heavy') {
                html += this.renderSpecialtyHeavyUI(corp, isReadOnly);
            } 
            else {
                html += `
                    <div class="panel p-4 text-center text-gray-400">
                        未偵測到該企業的客製化營運模式。
                    </div>
                `;
            }

            // 3. 只要玩家控股且非唯讀模式，即打通品牌與研發決策台 (為收購之國際大廠進行深度品牌升級運作)
            if (!isReadOnly) {
                html += `
                    <!-- 品牌與研發決策台 -->
                    <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-80 shadow-[0_0_15px_rgba(255,255,255,0.05)] rounded-lg mt-4">
                        <h4 class="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-3 flex items-center gap-2">
                            🏛️ 品牌聲譽與研發技術決策台 (Brand & Tech Decisions)
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <!-- 決策 1 -->
                            <div class="bg-slate-950 p-3 rounded border border-slate-800 hover:border-yellow-500 transition flex flex-col justify-between">
                                <div>
                                    <div class="text-xs font-bold text-yellow-400">📢 投放大眾媒體廣告</div>
                                    <p class="text-[10px] text-slate-400 mt-1">在電視、社群與各大網路媒體發起行銷，迅速提升品牌大眾聲望與買氣。</p>
                                </div>
                                <button onclick="CEO_AUTO.buyMarketingAd('${corp.id}')" class="btn-retro text-xs py-1.5 px-3 border-yellow-500 text-yellow-500 hover:bg-yellow-950 transition mt-3 font-bold">
                                    廣告投放決策<br><span class="text-[9px] text-slate-500">花費 $2,500,000 | 聲譽 +5</span>
                                </button>
                            </div>

                            <!-- 決策 2 -->
                            <div class="bg-slate-950 p-3 rounded border border-slate-800 hover:border-yellow-600 transition flex flex-col justify-between">
                                <div>
                                    <div class="text-xs font-bold text-yellow-500">🎪 參展全球 A 級車展</div>
                                    <p class="text-[10px] text-slate-400 mt-1">參展日內瓦或法蘭克福頂級車展，發布重磅概念車款，引領全球車迷風潮。</p>
                                </div>
                                <button onclick="CEO_AUTO.joinGlobalCarShow('${corp.id}')" class="btn-retro text-xs py-1.5 px-3 border-yellow-600 text-yellow-600 hover:bg-yellow-900 transition mt-3 font-bold">
                                    參展國際車展<br><span class="text-[9px] text-slate-500">花費 $8,000,000 | 聲譽 +18</span>
                                </button>
                            </div>

                            <!-- 決策 3 -->
                            <div class="bg-slate-950 p-3 rounded border border-slate-800 hover:border-cyan-500 transition flex flex-col justify-between">
                                <div>
                                    <div class="text-xs font-bold text-cyan-400">🧪 聘請院士技術攻堅</div>
                                    <p class="text-[10px] text-slate-400 mt-1">聘任國際頂級工程院院士，建立前沿動力底盤與三電技術研發中心，攻克技術壁壘。</p>
                                </div>
                                <button onclick="CEO_AUTO.hireAcademician('${corp.id}')" class="btn-retro text-xs py-1.5 px-3 border-cyan-500 text-cyan-400 hover:bg-cyan-950 transition mt-3 font-bold">
                                    聘請技術院士<br><span class="text-[9px] text-slate-500">花費 $10,000,000 | 技術 +0.8</span>
                                </button>
                            </div>

                            <!-- 決策 4 -->
                            <div class="bg-slate-950 p-3 rounded border border-slate-800 hover:border-cyan-600 transition flex flex-col justify-between">
                                <div>
                                    <div class="text-xs font-bold text-cyan-500">🔬 建置精密防撞平台</div>
                                    <p class="text-[10px] text-slate-400 mt-1">購置百萬噸級一體化防撞力學實驗平台與超算風洞，突破車輛安全與動力流體極限。</p>
                                </div>
                                <button onclick="CEO_AUTO.buildTestPlatform('${corp.id}')" class="btn-retro text-xs py-1.5 px-3 border-cyan-600 text-cyan-500 hover:bg-cyan-900 transition mt-3 font-bold">
                                    建置防撞平台<br><span class="text-[9px] text-slate-500">花費 $18,000,000 | 技術 +2.0</span>
                                </button>
                            </div>

                            <!-- 決策 5 -->
                            <div class="bg-slate-950 p-3 rounded border border-slate-800 hover:border-magenta transition flex flex-col justify-between">
                                <div>
                                    <div class="text-xs font-bold text-magenta">🏎️ 冠名贊助 F1 頂級車隊</div>
                                    <p class="text-[10px] text-slate-400 mt-1">冠名贊助 F1 世界一級方程式錦標賽頂尖賽車隊，讓您的廠牌信仰在賽道狂飆。</p>
                                </div>
                                <button onclick="CEO_AUTO.sponsorF1Team('${corp.id}')" class="btn-retro text-xs py-1.5 px-3 border-magenta text-magenta hover:bg-magenta hover:text-white transition mt-3 font-bold">
                                    冠名贊助 F1<br><span class="text-[9px] text-slate-500">花費 $25,000,000 | 奢華 +25, 聲譽 +10</span>
                                </button>
                            </div>

                            <!-- 決策 6 -->
                            <div class="bg-slate-950 p-3 rounded border border-slate-800 hover:border-magenta transition flex flex-col justify-between">
                                <div>
                                    <div class="text-xs font-bold text-magenta">🥂 舉辦私人莊園奢華酒會</div>
                                    <p class="text-[10px] text-slate-400 mt-1">在私人高山別墅或摩納哥豪華遊艇，為頂富階級舉辦私享超跑俱樂部酒會。</p>
                                </div>
                                <button onclick="CEO_AUTO.hostEstateParty('${corp.id}')" class="btn-retro text-xs py-1.5 px-3 border-magenta border-opacity-70 text-magenta hover:bg-magenta hover:text-white transition mt-3 font-bold">
                                    舉辦私人酒會<br><span class="text-[9px] text-slate-500">花費 $5,000,000 | 奢華 +8</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            html += `</div>`;
            container.innerHTML = html;
        },

        // ==========================================
        // 3. 渲染二次細分特化產品選擇 UI
        // ==========================================
        renderSecondarySelectionUI(corp, container) {
            let optionsHtml = '';
            
            if (corp.bizModel === 'legacy_oem') {
                optionsHtml = `
                    <!-- 1. 國民家庭轎車 -->
                    <div class="bg-slate-950 p-4 rounded border border-slate-800 hover:border-yellow-500 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div class="md:w-3/4">
                            <span class="px-2 py-0.5 bg-yellow-950 border border-yellow-800 text-yellow-400 text-xs font-bold rounded">🚗 國民平價轎車產線 (Sedan)</span>
                            <div class="text-sm font-bold text-white mt-1.5">專屬車款：國產平價四門家庭轎車 (Family Sedan)</div>
                            <div class="text-xs text-slate-400 mt-1">💡 <b>生產線特權</b>：安全去化天數提高至 40 天（原為 35 天），經銷商抗壓能力增加，庫存折舊與利息壓力降低 20%。</div>
                        </div>
                        <button onclick="CEO_AUTO.selectSubModel('${corp.id}', 'oem_sedan')" class="btn-retro text-xs py-2 px-4 border-yellow-500 text-yellow-500 font-bold hover:bg-yellow-950 transition w-full md:w-auto">配置產線</button>
                    </div>

                    <!-- 2. 豪華智能休旅 -->
                    <div class="bg-slate-950 p-4 rounded border border-slate-800 hover:border-cyan-500 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div class="md:w-3/4">
                            <span class="px-2 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-bold rounded">🌟 豪華智能休旅車產線 (SUV)</span>
                            <div class="text-sm font-bold text-white mt-1.5">專屬車款：豪華智能運動休旅車 (Luxury Smart SUV)</div>
                            <div class="text-xs text-slate-400 mt-1">💡 <b>生產線特權</b>：由於具備高檔溢價，基礎銷量與每日營收額外增加 20%！但對於利率變動與市場消費力更為敏感。</div>
                        </div>
                        <button onclick="CEO_AUTO.selectSubModel('${corp.id}', 'oem_suv')" class="btn-retro text-xs py-2 px-4 border-cyan-500 text-cyan-400 font-bold hover:bg-cyan-950 transition w-full md:w-auto">配置產線</button>
                    </div>

                    <!-- 3. 商用貨卡貨車 -->
                    <div class="bg-slate-950 p-4 rounded border border-slate-800 hover:border-magenta transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div class="md:w-3/4">
                            <span class="px-2 py-0.5 bg-magenta bg-opacity-20 border border-magenta text-magenta text-xs font-bold rounded">🚛 輕型商業貨卡產線 (Truck)</span>
                            <div class="text-sm font-bold text-white mt-1.5">專屬車款：大批量商用輕卡與小發財車 (Commercial Truck)</div>
                            <div class="text-xs text-slate-400 mt-1">💡 <b>生產線特權</b>：商用底盤結構單純，每日大批量組裝之日常營運與製造折舊成本永久降低 15%！</div>
                        </div>
                        <button onclick="CEO_AUTO.selectSubModel('${corp.id}', 'oem_truck')" class="btn-retro text-xs py-2 px-4 border-magenta text-magenta font-bold hover:bg-magenta hover:text-white transition w-full md:w-auto">配置產線</button>
                    </div>
                `;
            } 
            else if (corp.bizModel === 'ev_innovator') {
                optionsHtml = `
                    <!-- 1. 純電平民轎車 -->
                    <div class="bg-slate-950 p-4 rounded border border-slate-800 hover:border-cyan-500 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div class="md:w-3/4">
                            <span class="px-2 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-bold rounded">⚡ 純電平民房車產線 (EV Sedan)</span>
                            <div class="text-sm font-bold text-white mt-1.5">專屬車款：平價一體化壓鑄純電五門房車 (Affordable EV Sedan)</div>
                            <div class="text-xs text-slate-400 mt-1">💡 <b>生產線特權</b>：極致規模化。每座超級工廠（Gigafactory）的成本壓低減免效果提升至 **7%**（原本 5%），減免上限拉高至 **45%**！</div>
                        </div>
                        <button onclick="CEO_AUTO.selectSubModel('${corp.id}', 'ev_sedan')" class="btn-retro text-xs py-2 px-4 border-cyan-500 text-cyan-400 font-bold hover:bg-cyan-950 transition w-full md:w-auto">配置產線</button>
                    </div>

                    <!-- 2. 重型防彈皮卡 -->
                    <div class="bg-slate-950 p-4 rounded border border-slate-800 hover:border-yellow-500 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div class="md:w-3/4">
                            <span class="px-2 py-0.5 bg-yellow-950 border border-yellow-800 text-yellow-400 text-xs font-bold rounded">🧱 重型防彈電車產線 (Cyber-Truck)</span>
                            <div class="text-sm font-bold text-white mt-1.5">專屬車款：重型防彈硬派純電皮卡與野外休旅 (Heavy Cyber-Truck)</div>
                            <div class="text-xs text-slate-400 mt-1">💡 <b>生產線特權</b>：狂野硬派。單車基礎銷售營收額外增加 25%，但因車身不鏽鋼組裝複雜，超級工廠擴建費用增為 $60,000,000。</div>
                        </div>
                        <button onclick="CEO_AUTO.selectSubModel('${corp.id}', 'ev_truck')" class="btn-retro text-xs py-2 px-4 border-yellow-500 text-yellow-500 font-bold hover:bg-yellow-950 transition w-full md:w-auto">配置產線</button>
                    </div>

                    <!-- 3. 超級智能旗艦 -->
                    <div class="bg-slate-950 p-4 rounded border border-slate-800 hover:border-magenta transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div class="md:w-3/4">
                            <span class="px-2 py-0.5 bg-magenta bg-opacity-20 border border-magenta text-magenta text-xs font-bold rounded">🧠 智能純電旗艦產線 (EV Flagship)</span>
                            <div class="text-sm font-bold text-white mt-1.5">專屬車款：高階全自動駕駛智能旗艦豪華座駕 (Intelligent EV Flagship)</div>
                            <div class="text-xs text-slate-400 mt-1">💡 <b>生產線特權</b>：軟體印鈔。FSD 自動駕駛初始滲透率直接從 **15% 起跳**（普通為 5%），且滲透率月增長速度提高 30%！</div>
                        </div>
                        <button onclick="CEO_AUTO.selectSubModel('${corp.id}', 'ev_flagship')" class="btn-retro text-xs py-2 px-4 border-magenta text-magenta font-bold hover:bg-magenta hover:text-white transition w-full md:w-auto">配置產線</button>
                    </div>
                `;
            } 
            else if (corp.bizModel === 'tier1_am') {
                optionsHtml = `
                    <!-- 1. 傳動齒輪系統 -->
                    <div class="bg-slate-950 p-4 rounded border border-slate-800 hover:border-cyan-500 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div class="md:w-3/4">
                            <span class="px-2 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-bold rounded">⚙️ 傳動齒輪系統產線 (Gears)</span>
                            <div class="text-sm font-bold text-white mt-1.5">專屬零組件：高精密電動車減速齒輪箱與動力差速組件 (Precision Gearbox)</div>
                            <div class="text-xs text-slate-400 mt-1">💡 <b>生產線特權</b>：壁壘極高。與大廠簽訂的 OEM 長約，每年強制 Cost Down 砍價降減比例直接減半（僅砍 2.5%）。</div>
                        </div>
                        <button onclick="CEO_AUTO.selectSubModel('${corp.id}', 'am_gears')" class="btn-retro text-xs py-2 px-4 border-cyan-500 text-cyan-400 font-bold hover:bg-cyan-950 transition w-full md:w-auto">配置產線</button>
                    </div>

                    <!-- 2. 車燈外觀碰撞件 -->
                    <div class="bg-slate-950 p-4 rounded border border-slate-800 hover:border-yellow-500 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div class="md:w-3/4">
                            <span class="px-2 py-0.5 bg-yellow-950 border border-yellow-800 text-yellow-400 text-xs font-bold rounded">💡 外觀車燈碰撞件產線 (AM Lights)</span>
                            <div class="text-sm font-bold text-white mt-1.5">專屬零組件：高階副廠專利 LED 頭燈與導光防霧尾燈 (AM LED Headlights)</div>
                            <div class="text-xs text-slate-400 mt-1">💡 <b>生產線特權</b>：AM 專家。全新碰撞件模具開發費降低 20%（僅需 $6,400,000），且 AM 售後每日額外利潤增加 15%！</div>
                        </div>
                        <button onclick="CEO_AUTO.selectSubModel('${corp.id}', 'am_lights')" class="btn-retro text-xs py-2 px-4 border-yellow-500 text-yellow-500 font-bold hover:bg-yellow-950 transition w-full md:w-auto">配置產線</button>
                    </div>

                    <!-- 3. 雷達與車用電子 -->
                    <div class="bg-slate-950 p-4 rounded border border-slate-800 hover:border-magenta transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div class="md:w-3/4">
                            <span class="px-2 py-0.5 bg-magenta bg-opacity-20 border border-magenta text-magenta text-xs font-bold rounded">📡 毫米波雷達電子產線 (ADAS Radar)</span>
                            <div class="text-sm font-bold text-white mt-1.5">專屬零組件：77GHz/79GHz 車載毫米波雷達與盲點 TPMS 晶片 (ADAS Radar Systems)</div>
                            <div class="text-xs text-slate-400 mt-1">💡 <b>生產線特權</b>：法規防護。初始專利侵權起訴風險降為極低的 2%，且若不幸遭遇官司起訴，法院強制判賠金額減半！</div>
                        </div>
                        <button onclick="CEO_AUTO.selectSubModel('${corp.id}', 'am_radar')" class="btn-retro text-xs py-2 px-4 border-magenta text-magenta font-bold hover:bg-magenta hover:text-white transition w-full md:w-auto">配置產線</button>
                    </div>
                `;
            } 
            else if (corp.bizModel === 'specialty_heavy') {
                optionsHtml = `
                    <!-- 1. 限量傳奇超跑 -->
                    <div class="bg-slate-950 p-4 rounded border border-slate-800 hover:border-red-500 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div class="md:w-3/4">
                            <span class="px-2 py-0.5 bg-red-950 border border-red-800 text-red-400 text-xs font-bold rounded">🏎️ 限量傳奇極致超跑 (Hypercar)</span>
                            <div class="text-sm font-bold text-white mt-1.5">專屬重工：全球限量 V12 混合動力傳奇超級跑車 (Hypercar Series)</div>
                            <div class="text-xs text-slate-400 mt-1">💡 <b>生產線特權</b>：解鎖「限量超跑信仰配額」營運台！品牌稀缺度溢價額外 +10% 加成，可追求最高單車毛利。</div>
                        </div>
                        <button onclick="CEO_AUTO.selectSubModel('${corp.id}', 'heavy_supercar')" class="btn-retro text-xs py-2 px-4 border-red-500 text-red-500 font-bold hover:bg-red-950 transition w-full md:w-auto">配置產線</button>
                    </div>

                    <!-- 2. 國防特許軍工 -->
                    <div class="bg-slate-950 p-4 rounded border border-slate-800 hover:border-cyan-500 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div class="md:w-3/4">
                            <span class="px-2 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-bold rounded">🛡️ 國防特許重工防務 (Defense)</span>
                            <div class="text-sm font-bold text-white mt-1.5">專屬重工：特種國家防務裝甲車與空軍高級教練機 (Defense & Aerospace)</div>
                            <div class="text-xs text-slate-400 mt-1">💡 <b>生產線特權</b>：解鎖「國家特許國防標案競標」營運台！競標中標率額外提升 15%，得標後特許合約天數增加至 150 天！</div>
                        </div>
                        <button onclick="CEO_AUTO.selectSubModel('${corp.id}', 'heavy_defense')" class="btn-retro text-xs py-2 px-4 border-cyan-500 text-cyan-400 font-bold hover:bg-cyan-950 transition w-full md:w-auto">配置產線</button>
                    </div>

                    <!-- 3. 高端綠能競技公路車 -->
                    <div class="bg-slate-950 p-4 rounded border border-slate-800 hover:border-green-500 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div class="md:w-3/4">
                            <span class="px-2 py-0.5 bg-green-950 border border-green-800 text-green-400 text-xs font-bold rounded">🚲 綠能公路自行車 (Racing E-Bike)</span>
                            <div class="text-sm font-bold text-white mt-1.5">專屬重工：高端競技碳纖維公路自行車與智能 E-Bike (Racing E-Bike)</div>
                            <div class="text-xs text-slate-400 mt-1">💡 <b>生產線特權</b>：解鎖「E-Bike綠能智慧電裝研發」營運台！綠色銷售溢價比例由每級 8% 加大提升至 12% 綠能加成！</div>
                        </div>
                        <button onclick="CEO_AUTO.selectSubModel('${corp.id}', 'heavy_ebike')" class="btn-retro text-xs py-2 px-4 border-green-500 text-green-400 font-bold hover:bg-green-950 transition w-full md:w-auto">配置產線</button>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="space-y-4">
                    <div class="panel p-5 border-yellow-500 bg-slate-900 bg-opacity-80">
                        <h3 class="text-xl text-yellow-400 font-extrabold mb-2 tracking-wide flex items-center gap-2">🏭 配置客製化汽車重工生產線</h3>
                        <p class="text-sm text-slate-300 mb-5">
                            新創的 ${corp.name} 目前尚未配置具體的特化產品線。請在下方為您的業務模型配置一條專屬的特種車輛或零組件生產線，這將配置您公司的<b>核心客製化產品名稱</b>並賦予專屬的<b>生產線特權與利潤加成</b>！
                        </p>
                        <div class="space-y-3.5">
                            ${optionsHtml}
                        </div>
                        <div class="text-xs text-slate-500 mt-4 text-center">
                            • 注意：配置產品線需要扣除實收資本中的 <b>$2,000,000</b> 作為開工建線費。一旦配置完成將無法更改。
                        </div>
                    </div>
                </div>
            `;
        },

        // ==========================================
        // 4. 執行二次細分產品選擇
        // ==========================================
        selectSubModel(corpId, subModel) {
            const corp = app.state.stocks.find(s => s.id === corpId);
            if (!corp) return;

            const cost = 2000000;
            if (corp.corporateCash < cost) {
                app.log("【建線失敗】公司帳上現金不足以支付開工建線費 ($2,000,000)！", "text-red-400 font-bold");
                return;
            }

            corp.corporateCash -= cost;
            corp.subModel = subModel;

            // 根據選擇 of subModel 特化 customProduct 與變數
            switch(subModel) {
                // Legacy OEM
                case 'oem_sedan':
                    corp.customProduct = '國產平價四門家庭轎車 (Family Sedan)';
                    break;
                case 'oem_suv':
                    corp.customProduct = '豪華智能運動休旅車 (Luxury Smart SUV)';
                    break;
                case 'oem_truck':
                    corp.customProduct = '大批量商用輕卡與小發財車 (Commercial Truck)';
                    break;
                
                // EV Innovator
                case 'ev_sedan':
                    corp.customProduct = '平價一體化壓鑄純電五門房車 (Affordable EV Sedan)';
                    break;
                case 'ev_truck':
                    corp.customProduct = '重型防彈硬派純電皮卡與野外休旅 (Heavy Cyber-Truck)';
                    break;
                case 'ev_flagship':
                    corp.customProduct = '高階全自動駕駛智能旗艦豪華座駕 (Intelligent EV Flagship)';
                    corp.fsdPenetration = 0.15; // 初始 15% 起跳
                    break;

                // Tier 1 AM
                case 'am_gears':
                    corp.customProduct = '高精密電動車減速齒輪箱與動力差速組件 (Precision Gearbox)';
                    break;
                case 'am_lights':
                    corp.customProduct = '高階副廠專利 LED 頭燈與導光防霧尾燈 (AM LED Headlights)';
                    break;
                case 'am_radar':
                    corp.customProduct = '77GHz/79GHz 車載毫米波雷達與盲點 TPMS 晶片 (ADAS Radar Systems)';
                    corp.lawsuitRisk = 0.02; // 初始風險 2%
                    break;

                // Specialty Heavy
                case 'heavy_supercar':
                    corp.customProduct = '全球限量 V12 混合動力傳奇超級跑車 (Hypercar Series)';
                    corp.scarcityQuota = 499;
                    corp.brandScarcity = 1.0;
                    break;
                case 'heavy_defense':
                    corp.customProduct = '特種國家防務裝甲車與空軍高級教練機 (Defense & Aerospace)';
                    corp.defenseTenderDays = 0;
                    corp.rndDepth = 1;
                    break;
                case 'heavy_ebike':
                    corp.customProduct = '高端競技碳纖維公路自行車與智能 E-Bike (Racing E-Bike)';
                    corp.ebikeRndLevel = 1;
                    corp.inventoryDays = 30;
                    break;
            }

            // 重新初始化資產數據，確保新增變數完美綁定
            this.initAssets(corp);

            app.log(`【生產線啟動】🎉 恭喜！${corp.name} 成功啟動了「${corp.customProduct}」精密生產線！建線費 $2,000,000 已扣除，專屬生產特權已即時解鎖生效！`, 'text-yellow-400 font-extrabold animate-pulse text-lg');

            // 零延遲刷新 DOM 現金與 UI
            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(corp.corporateCash);
            app.updateUI();
            this.renderAutoTab(corp, document.getElementById('ops-tab-content'), false);
        },

        // 5. 獲取業務模式中文名稱
        getBizModelName(model) {
            switch(model) {
                case 'legacy_oem': return '傳統整車巨頭';
                case 'ev_innovator': return '新能源與智能車';
                case 'tier1_am': return '汽車零組件與 AM 碰撞件';
                case 'specialty_heavy': return '特種車與重型工業';
                default: return '常規汽車工業';
            }
        },

        // ==========================================
        // 6. 傳統整車巨頭 (Legacy OEM) UI 渲染
        // ==========================================
        renderLegacyOemUI(corp, isReadOnly) {
            const evPct = Math.round(corp.evRatio * 100);
            const icePct = 100 - evPct;
            
            const limit = corp.subModel === 'oem_sedan' ? 40 : 35;
            
            // 計算當前的碳稅風險提示
            const carbonTaxWarning = corp.evRatio < 0.3 ? `
                <div class="bg-amber-950 border border-amber-800 text-amber-400 p-2 text-xs rounded mb-3">
                    ⚠️ <b>環保新規碳稅警告</b>：當前電動車 (EV) 生產佔比低於 30%（目前僅 ${evPct}%）。若政府實施綠能限制，每日將面臨 $2,000,000 的碳稅罰款！建議儘快提升 EV 產能佔比。
                </div>
            ` : '';

            // 庫存警告
            const inventoryWarning = corp.inventoryDays > limit ? `
                <div class="bg-red-950 border border-red-900 text-red-400 p-2 text-xs rounded mb-3">
                    🚨 <b>經銷商庫存水位過高</b>：庫存天數已達 ${corp.inventoryDays.toFixed(0)} 天（安全上限 ${limit} 天）。高庫存利息損耗與折舊正嚴重吞噬利潤。請發放經銷商補貼去化庫存！
                </div>
            ` : '';

            return `
                ${carbonTaxWarning}
                ${inventoryWarning}
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- 左側：產能滑桿調控 -->
                    <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-40">
                        <h4 class="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-3">🎛️ ICE / EV 產能蹺蹺板</h4>
                        <div class="space-y-4">
                            <div>
                                <div class="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>燃油車 (ICE) 產能: ${icePct}%</span>
                                    <span>電動車 (EV) 產能: ${evPct}%</span>
                                </div>
                                <input type="range" id="oem-ev-slider" class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" 
                                    min="0" max="100" step="5" value="${evPct}" 
                                    ${isReadOnly ? 'disabled' : ''} 
                                    oninput="CEO_AUTO.updateOemEvRatioUI(this.value)">
                            </div>
                            <div class="text-xs text-slate-400 space-y-1 bg-slate-950 p-2 rounded">
                                <p>• <b>燃油車 (ICE)</b>：利潤穩健，但面臨排碳政策風險。</p>
                                <p>• <b>電動車 (EV)</b>：享有環保政策免稅，但初期折舊與 Capex 負擔沉重，會提升公司 Beta 波動值。</p>
                            </div>
                            ${!isReadOnly ? `
                                <button class="btn-retro w-full py-2 border-yellow-500 text-yellow-500 hover:bg-yellow-950 hover:text-white" 
                                    onclick="CEO_AUTO.setOemEvRatio(${app.state.stocks.indexOf(corp)})">
                                    💾 確認產能比例配置
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- 右側：經銷商庫存管理 -->
                    <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-40">
                        <h4 class="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-3">🏬 經銷商網路與庫存管理</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between text-xs">
                                <span>經銷商安全庫存天數:</span>
                                <span class="text-cyan-400 font-bold">${limit} 天</span>
                            </div>
                            <div class="flex justify-between text-xs">
                                <span>當前庫存天數:</span>
                                <span class="${corp.inventoryDays > limit ? 'text-red-400 font-extrabold animate-pulse' : 'text-green-400 font-bold'}">${corp.inventoryDays.toFixed(1)} 天</span>
                            </div>
                            <div class="flex justify-between text-xs">
                                <span>經銷商促銷補貼成效:</span>
                                <span class="text-yellow-400 font-bold">${corp.dealerSubsidy}% 促銷力道</span>
                            </div>

                            <div class="border-t border-slate-800 pt-3 mt-2">
                                <div class="text-xs text-slate-400 mb-2">發放經銷商補貼以加快降價去化庫存：</div>
                                ${!isReadOnly ? `
                                    <div class="grid grid-cols-2 gap-2">
                                        <button class="btn-retro py-1 text-xs border-green-600 text-green-400 hover:bg-green-950" 
                                            onclick="CEO_AUTO.applyDealerSubsidy(${app.state.stocks.indexOf(corp)}, 10)">
                                            💰 輕度補貼 (去庫存 5 天)<br><span class="text-[10px] text-slate-400">花費 $1,500,000</span>
                                        </button>
                                        <button class="btn-retro py-1 text-xs border-magenta text-magenta-400 hover:bg-red-950" 
                                            onclick="CEO_AUTO.applyDealerSubsidy(${app.state.stocks.indexOf(corp)}, 25)">
                                            🔥 強力出清 (去庫存 15 天)<br><span class="text-[10px] text-slate-400">花費 $4,000,000</span>
                                        </button>
                                    </div>
                                ` : '<div class="text-xs text-slate-500 text-center py-2">唯讀模式下無法執行庫存補貼決策。</div>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        updateOemEvRatioUI(val) {
            const sliderLabel = document.querySelector('#oem-ev-slider');
            if (sliderLabel) {
                const iceVal = 100 - val;
                const prev = sliderLabel.previousElementSibling;
                if (prev) {
                    prev.innerHTML = `<span>燃油車 (ICE) 產能: ${iceVal}%</span><span>電動車 (EV) 產能: ${val}%</span>`;
                }
            }
        },

        setOemEvRatio(idx) {
            const s = app.state.stocks[idx];
            if (!s) return;

            const slider = document.getElementById('oem-ev-slider');
            if (!slider) return;

            const val = parseFloat(slider.value) / 100;
            s.evRatio = val;

            // 動態影響 Beta 波動度
            s.beta = parseFloat((0.8 + val * 1.5).toFixed(2));

            app.log(`【產能調整】${s.name} 已將電動車產能佔比調整至 ${(val * 100).toFixed(0)}%。(公司 Beta 變更為 ${s.beta})`, 'text-yellow');
            
            app.updateUI();
            this.renderAutoTab(s, document.getElementById('ops-tab-content'), false);
        },

        applyDealerSubsidy(idx, percent) {
            const s = app.state.stocks[idx];
            if (!s) return;

            const cost = percent === 10 ? 1500000 : 4000000;
            if (s.corporateCash < cost) {
                app.log("【資金不足】公司帳上現金不足以支付經銷商庫存補貼！", "text-red-400 font-bold");
                return;
            }

            s.corporateCash -= cost;
            s.dealerSubsidy = percent;
            
            const daysReduced = percent === 10 ? 5 : 15;
            s.inventoryDays = Math.max(10, s.inventoryDays - daysReduced);

            app.log(`【庫存去化】${s.name} 發放 ${percent}% 經銷商促銷補貼，花費 $${app.formatMoney(cost)}，庫存天數成功去化降至 ${s.inventoryDays.toFixed(1)} 天！`, 'text-green-400 font-bold');

            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(s.corporateCash);
            app.updateUI();
            this.renderAutoTab(s, document.getElementById('ops-tab-content'), false);
        },

        // ==========================================
        // 7. 新新能源與智能車 (EV Innovator) UI 渲染
        // ==========================================
        renderEvInnovatorUI(corp, isReadOnly) {
            const factories = corp.gigaFactories || 1;
            const mult = corp.subModel === 'ev_sedan' ? 7 : 5;
            const costReduction = Math.min(45, factories * mult); 

            // 降價戰狀態
            const priceWarStatus = corp.isPriceWar ? `
                <div class="bg-rose-950 border border-rose-900 text-rose-300 p-2 text-xs rounded mb-3 flex justify-between items-center animate-pulse">
                    <span>🔥 <b>降價焦土戰進行中</b>：正在大幅壓縮全球傳統整車巨頭的銷售額，但自身車輛毛利率亦暫時減少 10%。</span>
                    ${!isReadOnly ? `
                        <button class="btn-retro py-1 px-2 border-slate-500 text-slate-300 text-[10px]" onclick="CEO_AUTO.togglePriceWar(${app.state.stocks.indexOf(corp)}, false)">
                            🛑 停火
                        </button>
                    ` : ''}
                </div>
            ` : '';

            // 擴建超級工廠預算
            const factoryCost = corp.subModel === 'ev_truck' ? 60000000 : 50000000;

            return `
                ${priceWarStatus}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- 左側：超級工廠擴建 -->
                    <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-40">
                        <h4 class="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-3">🏭 一體化壓鑄超級工廠 (Gigafactory)</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between text-xs">
                                <span>超級工廠總數:</span>
                                <span class="text-cyan-400 font-bold">${factories} 座</span>
                            </div>
                            <div class="flex justify-between text-xs">
                                <span>一體化壓鑄硬體成本減讓:</span>
                                <span class="text-green-400 font-bold">-${costReduction}%</span>
                            </div>
                            
                            <div class="border-t border-slate-800 pt-3 mt-2">
                                <div class="text-xs text-slate-400 mb-2">擴建一座超級工廠（耗資 $${app.formatMoney(factoryCost)}）：</div>
                                ${!isReadOnly ? `
                                    <button class="btn-retro w-full py-2 border-cyan-500 text-cyan-400 hover:bg-cyan-950 hover:text-white" 
                                        onclick="CEO_AUTO.buildGigaFactory(${app.state.stocks.indexOf(corp)})">
                                        🏗️ 擴建一座超級工廠
                                    </button>
                                ` : '<div class="text-xs text-slate-500 text-center py-2">唯讀模式下無法擴建工廠。</div>'}
                            </div>
                        </div>
                    </div>

                    <!-- 右側：FSD 自動駕駛軟體訂閱 -->
                    <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-40">
                        <h4 class="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-3">🧠 FSD 全自動駕駛訂閱 (軟體印鈔)</h4>
                        <div class="space-y-4">
                            <div>
                                <div class="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>當前軟體定價: $${app.formatMoney(corp.fsdPrice)}</span>
                                    <span>訂閱滲透率: ${(corp.fsdPenetration * 100).toFixed(1)}%</span>
                                </div>
                                <input type="range" id="ev-fsd-slider" class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" 
                                    min="50000" max="500000" step="10000" value="${corp.fsdPrice}" 
                                    ${isReadOnly ? 'disabled' : ''} 
                                    oninput="CEO_AUTO.updateFsdSliderUI(this.value)">
                            </div>
                            
                            <div class="text-xs text-slate-400 bg-slate-950 p-2 rounded">
                                <p>• <b>被動收益</b>：FSD 月租訂閱為極高毛利的軟體收入。</p>
                                <p>• <b>滲透率</b>：價格降低、公司聲譽與技術研發標準提高，均會推升訂閱滲透率。</p>
                            </div>

                            ${!isReadOnly ? `
                                <div class="grid grid-cols-2 gap-2">
                                    <button class="btn-retro py-1.5 text-xs border-yellow-500 text-yellow-500 hover:bg-yellow-950" 
                                        onclick="CEO_AUTO.setFsdPrice(${app.state.stocks.indexOf(corp)})">
                                        💾 儲存 FSD 售價
                                    </button>
                                    <button class="btn-retro py-1.5 text-xs border-rose-600 text-rose-400 hover:bg-rose-950" 
                                        onclick="CEO_AUTO.togglePriceWar(${app.state.stocks.indexOf(corp)}, true)" 
                                        ${corp.isPriceWar ? 'disabled' : ''}>
                                        🔥 發動降價焦土戰
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        },

        updateFsdSliderUI(val) {
            const slider = document.getElementById('ev-fsd-slider');
            if (slider) {
                const prev = slider.previousElementSibling;
                if (prev) {
                    prev.querySelector('span').innerText = `當前軟體定價: $${app.formatMoney(val)}`;
                }
            }
        },

        buildGigaFactory(idx) {
            const s = app.state.stocks[idx];
            if (!s) return;

            const cost = s.subModel === 'ev_truck' ? 60000000 : 50000000;
            if (s.corporateCash < cost) {
                app.log(`【資金不足】公司帳上現金不足以支付超級工廠的擴建費用 ($${app.formatMoney(cost)})！`, "text-red-400 font-bold");
                return;
            }

            s.corporateCash -= cost;
            s.gigaFactories = (s.gigaFactories || 1) + 1;

            const mult = s.subModel === 'ev_sedan' ? 7 : 5;
            app.log(`【超級工廠】${s.name} 擴建了第 ${s.gigaFactories} 座超級工廠！一體化壓鑄成本再次減免 ${mult}% (累計 -${Math.min(45, s.gigaFactories * mult)}%)。`, 'text-cyan-400 font-bold animate-pulse');

            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(s.corporateCash);
            app.updateUI();
            this.renderAutoTab(s, document.getElementById('ops-tab-content'), false);
        },

        setFsdPrice(idx) {
            const s = app.state.stocks[idx];
            if (!s) return;

            const slider = document.getElementById('ev-fsd-slider');
            if (!slider) return;

            const val = parseFloat(slider.value);
            s.fsdPrice = val;

            app.log(`【軟體定價】${s.name} 已將 FSD 全自動駕駛售價設定為 $${app.formatMoney(val)}。`, 'text-yellow');
            
            app.updateUI();
            this.renderAutoTab(s, document.getElementById('ops-tab-content'), false);
        },

        togglePriceWar(idx, state) {
            const s = app.state.stocks[idx];
            if (!s) return;

            s.isPriceWar = state;

            if (state) {
                app.log(`【降價焦土戰】${s.name} 正式發動全球「價格焦土戰」！大幅打壓全球傳統大廠銷售，使其經銷商庫存暴表，但自身硬體毛利亦有下挫！`, 'text-red-400 font-bold animate-pulse text-lg');
            } else {
                app.log(`【停火決定】${s.name} 宣佈停息降價焦土戰，硬體車輛毛利回歸常態。`, 'text-slate-300');
            }

            app.updateUI();
            this.renderAutoTab(s, document.getElementById('ops-tab-content'), false);
        },

        // ==========================================
        // 8. 汽車零組件與 AM 碰撞件 (Tier 1 & AM) UI 渲染
        // ==========================================
        renderTier1AmUI(corp, isReadOnly) {
            const molds = corp.amMolds || 2;
            const contracts = corp.oemContracts || 1;

            const costDownPct = (corp.oemCostDownYears || 0) * (corp.subModel === 'am_gears' ? 2.5 : 5);
            const revMult = corp.subModel === 'am_lights' ? 1.15 : 1.0;
            const moldRevenue = molds * 750000 * revMult;

            // 隨機起訴官司提示
            const lawsuitRiskWarning = corp.lawsuitRisk > 0.4 ? `
                <div class="bg-red-950 border border-red-900 text-red-300 p-2.5 text-xs rounded mb-3 animate-pulse">
                    🚨 <b>大廠專利訴訟侵權警報</b>：當前 AM 外觀模具開發引發的專利訴訟風險達 ${(corp.lawsuitRisk * 100).toFixed(0)}%！極易遭遇原廠天價求償，請儘快向法院與原廠尋求「專利和解授權」！
                </div>
            ` : '';

            // 模具開發費用
            const moldCost = corp.subModel === 'am_lights' ? 6400000 : 8000000;

            return `
                ${lawsuitRiskWarning}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- 左側：OEM 大廠長約與認證 -->
                    <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-40">
                        <h4 class="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-3">⛓️ OEM 國際車廠品質認證</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between text-xs">
                                <span>品質認證合約長約:</span>
                                <span class="text-cyan-400 font-bold">${corp.oemContracts} 個長約</span>
                            </div>
                            <div class="flex justify-between text-xs">
                                <span>長約累計 Cost Down 折價:</span>
                                <span class="text-red-400 font-bold">-${costDownPct}%</span>
                            </div>
                            <div class="flex justify-between text-xs">
                                <span>每日 OEM 長約淨收入:</span>
                                <span class="text-green-400 font-bold">$${app.formatMoney(corp.oemContracts * 1500000 * (1 - costDownPct/100))}</span>
                            </div>

                            <div class="border-t border-slate-800 pt-3 mt-2">
                                <div class="text-xs text-slate-400 mb-2">爭取全新國際車廠 OEM 長約認證（耗資 $15,000,000）：</div>
                                ${!isReadOnly ? `
                                    <button class="btn-retro w-full py-2 border-cyan-500 text-cyan-400 hover:bg-cyan-950 hover:text-white" 
                                        onclick="CEO_AUTO.certifyOemContract(${app.state.stocks.indexOf(corp)})">
                                        ⛓️ 申請爭取車廠認證
                                    </button>
                                ` : '<div class="text-xs text-slate-500 text-center py-2">唯讀模式下無法爭取合約。</div>'}
                            </div>
                        </div>
                    </div>

                    <!-- 右側：AM 碰撞模具與專利攻防 -->
                    <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-40">
                        <h4 class="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-3">🛠️ AM 副廠碰撞外觀件模具池</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between text-xs">
                                <span>開發副廠碰撞件模具:</span>
                                <span class="text-yellow-400 font-bold">${corp.amMolds} 套</span>
                            </div>
                            <div class="flex justify-between text-xs">
                                <span>預估 AM 每日額外銷售利潤:</span>
                                <span class="text-green-400 font-bold">+$${app.formatMoney(moldRevenue)}</span>
                            </div>
                            <div class="flex justify-between text-xs">
                                <span>大廠專利訴訟侵權風險:</span>
                                <span class="${corp.lawsuitRisk > 0.4 ? 'text-red-400 font-bold' : 'text-slate-300'}">${(corp.lawsuitRisk * 100).toFixed(0)}%</span>
                            </div>

                            <div class="border-t border-slate-800 pt-3 mt-2 space-y-2">
                                ${!isReadOnly ? `
                                    <button class="btn-retro w-full py-2 border-yellow-500 text-yellow-400 hover:bg-yellow-950 hover:text-white text-xs" 
                                        onclick="CEO_AUTO.developAmMold(${app.state.stocks.indexOf(corp)})">
                                        🛠️ 開發一套副廠專利模具 (花費 $${app.formatMoney(moldCost)})
                                    </button>
                                    <button class="btn-retro w-full py-2 border-green-600 text-green-400 hover:bg-green-950 hover:text-white text-xs" 
                                        onclick="CEO_AUTO.settlePatentLawsuits(${app.state.stocks.indexOf(corp)})">
                                        🛡️ 專利和解授權 (降低 50% 訴訟風險 / 花費 $5,000,000)
                                    </button>
                                ` : '<div class="text-xs text-slate-500 text-center py-2">唯讀模式下無法執行模具開發或和解決策。</div>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        certifyOemContract(idx) {
            const s = app.state.stocks[idx];
            if (!s) return;

            // 汽車重工企業的技術研發標準限制 (品質認證大廠長約限制，對所有自創或低技術企業均適用)
            const nextContract = (s.oemContracts || 1) + 1;
            const reqTech = nextContract * 3.0; // 每個合約需要 3.0 級技術 (即 3.0, 6.0, 9.0 級)
            if ((s.techStandard || 1.0) < reqTech) {
                app.log(`【品質認證失敗】${s.name} 技術等級不足！要爭取第 ${nextContract} 個 OEM 大廠長約，技術標準必須達到 ${reqTech.toFixed(1)} 級 (當前僅 ${(s.techStandard || 1.0).toFixed(1)} 級)。請先於決策台進行技術攻堅！`, "text-red-400 font-bold");
                return;
            }

            const cost = 15000000;
            if (s.corporateCash < cost) {
                app.log("【資金不足】公司帳上現金不足以支付車廠 OEM 長約品質認證費用 ($15,000,000)！", "text-red-400 font-bold");
                return;
            }

            s.corporateCash -= cost;
            s.oemContracts = (s.oemContracts || 1) + 1;

            app.log(`【OEM 長約】🎉 恭喜！${s.name} 順利通過國際大廠品質審核認證，取得第 ${s.oemContracts} 個五年穩定 OEM 長約，每日穩定現金流入大幅提升！`, 'text-cyan-400 font-bold');

            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(s.corporateCash);
            app.updateUI();
            this.renderAutoTab(s, document.getElementById('ops-tab-content'), false);
        },

        developAmMold(idx) {
            const s = app.state.stocks[idx];
            if (!s) return;

            const cost = s.subModel === 'am_lights' ? 6400000 : 8000000;
            if (s.corporateCash < cost) {
                app.log(`【資金不足】公司帳上現金不足以支付全新 AM 碰撞件模具開發費 ($${app.formatMoney(cost)})！`, "text-red-400 font-bold");
                return;
            }

            s.corporateCash -= cost;
            s.amMolds = (s.amMolds || 2) + 1;
            
            // 雷達電子模式訴訟風險極低
            const addedRisk = s.subModel === 'am_radar' ? 0.02 : 0.07;
            s.lawsuitRisk = Math.min(0.9, (s.lawsuitRisk || 0.05) + addedRisk);

            app.log(`【模具開發】${s.name} 成功建置第 ${s.amMolds} 套產品模具！AM 售後銷售大增，大廠專利侵權訴訟風險為 ${(s.lawsuitRisk * 100).toFixed(0)}%。`, 'text-yellow-400 font-bold');

            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(s.corporateCash);
            app.updateUI();
            this.renderAutoTab(s, document.getElementById('ops-tab-content'), false);
        },

        settlePatentLawsuits(idx) {
            const s = app.state.stocks[idx];
            if (!s) return;

            const cost = 5000000;
            if (s.corporateCash < cost) {
                app.log("【資金不足】公司帳上現金不足以支付專利授權和解費用 ($5,000,000)！", "text-red-400 font-bold");
                return;
            }

            s.corporateCash -= cost;
            s.lawsuitRisk = Math.max(0.01, (s.lawsuitRisk || 0.05) * 0.5);

            app.log(`【專利和解】${s.name} 與主要原廠達成外觀專利授權和解！大廠專利侵權訴訟風險降至 ${(s.lawsuitRisk * 100).toFixed(0)}%。`, 'text-green-400 font-bold');

            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(s.corporateCash);
            app.updateUI();
            this.renderAutoTab(s, document.getElementById('ops-tab-content'), false);
        },

        // ==========================================
        // 9. 特種車與重型工業 (Specialty & Heavy) UI 渲染
        // ==========================================
        renderSpecialtyHeavyUI(corp, isReadOnly) {
            if (corp.id === 'RACE' || corp.subModel === 'heavy_supercar') { // 超跑
                const quota = corp.scarcityQuota || 500;
                
                // 根據配額計算信仰稀缺性溢價
                let scarcityPct = 1.0;
                let priceMult = 1.0;
                const bonus = corp.subModel === 'heavy_supercar' ? 0.1 : 0.0;
                
                if (quota < 300) { scarcityPct = 1.0; priceMult = 1.5 + bonus; }
                else if (quota < 600) { scarcityPct = 0.95; priceMult = 1.3 + bonus; }
                else if (quota < 1200) { scarcityPct = 0.70; priceMult = 1.1 + bonus; }
                else if (quota < 3000) { scarcityPct = 0.40; priceMult = 0.9 + bonus; }
                else { scarcityPct = 0.10; priceMult = 0.5; }

                return `
                    <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-40">
                        <h4 class="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-3">躍馬傳奇 — 年度超跑限量配額與信仰溢價</h4>
                        <div class="space-y-4">
                            <div>
                                <div class="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>年度全球分配配額: ${quota} 台</span>
                                    <span>品牌信仰稀缺度: ${(scarcityPct * 100).toFixed(0)}%</span>
                                </div>
                                <input type="range" id="heavy-quota-slider" class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" 
                                    min="100" max="5000" step="100" value="${quota}" 
                                    ${isReadOnly ? 'disabled' : ''} 
                                    oninput="CEO_AUTO.updateQuotaSliderUI(this.value)">
                            </div>
                            
                            <div class="flex justify-between text-xs bg-slate-950 p-3 rounded">
                                <span>單車信仰稀缺溢價:</span>
                                <span class="${priceMult >= 1.3 ? 'text-green-400 font-bold' : priceMult < 0.9 ? 'text-red-400 font-bold' : 'text-slate-300'}">x${priceMult.toFixed(2)} 售價倍率</span>
                            </div>

                            <div class="text-xs text-slate-400 space-y-1">
                                <p>• <b>配額極低 (<300)</b>：稀缺性 100%，單車毛利率狂飆至 50% 以上，但出貨量低。</p>
                                <p>• <b>配額過高 (>3000)</b>：引發「信仰崩塌」事件，稀缺性歸零，單車毛利額暴跌，損害品牌價值。</p>
                            </div>

                            ${!isReadOnly ? `
                                <button class="btn-retro w-full py-2 border-yellow-500 text-yellow-500 hover:bg-yellow-950" 
                                    onclick="CEO_AUTO.setScarcityQuota(${app.state.stocks.indexOf(corp)})">
                                    💾 保存年度超跑限量配額
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            } 
            else if (corp.id === '2634' || corp.subModel === 'heavy_defense') { // 漢翔國防
                const days = corp.defenseTenderDays || 0;
                const winRate = Math.min(95, 30 + (corp.rndDepth || 1) * 15 + (corp.subModel === 'heavy_defense' ? 15 : 0));
                
                const tenderStatus = days > 0 ? `
                    <div class="bg-cyan-950 border border-cyan-900 text-cyan-300 p-3 text-xs rounded mb-3 animate-pulse flex justify-between items-center">
                        <span>🚀 <b>國防特許軍工訂單執行中</b>：防務戰機與裝甲車大合約執行中，每日享有 $3,000,000 穩定淨利潤，完全不受外部利息與油價影響！</span>
                        <span class="text-white font-bold">剩餘 ${days} 天</span>
                    </div>
                ` : `
                    <div class="bg-slate-950 border border-slate-800 text-slate-400 p-3 text-xs rounded mb-3 text-center">
                        🛡️ 目前無執行中的特許國防訂單，每日僅靠民用精密代工之低毛利維持日常。
                    </div>
                `;

                return `
                    ${tenderStatus}
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-40">
                            <h4 class="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-3">🛡️ 國家特許國防軍事教練機標案</h4>
                            <div class="space-y-3">
                                <div class="flex justify-between text-xs">
                                    <span>國防特種研發深度:</span>
                                    <span class="text-cyan-400 font-bold">等級 ${corp.rndDepth || 1}</span>
                                </div>
                                <div class="flex justify-between text-xs">
                                    <span>投標中標機率 (隨研發深度提升):</span>
                                    <span class="text-green-400 font-bold">${winRate}%</span>
                                </div>

                                <div class="border-t border-slate-800 pt-3 mt-2 space-y-2">
                                    ${!isReadOnly ? `
                                        <button class="btn-retro w-full py-2 border-cyan-500 text-cyan-400 hover:bg-cyan-950" 
                                            onclick="CEO_AUTO.upgradeHeavyRnd(${app.state.stocks.indexOf(corp)})">
                                            🚀 提升特種國防研發深度 (花費 $6,000,000)
                                        </button>
                                        <button class="btn-retro w-full py-2 border-magenta text-magenta-400 hover:bg-red-950" 
                                            onclick="CEO_AUTO.bidDefenseTender(${app.state.stocks.indexOf(corp)})" 
                                            ${days > 0 ? 'disabled' : ''}>
                                            🛡️ 競標新一期國防採購案 (花費 $8,000,000)
                                        </button>
                                    ` : '<div class="text-xs text-slate-500 text-center py-2">唯讀模式下無法參與國家標案。</div>'}
                                </div>
                            </div>
                        </div>

                        <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-40 flex flex-col justify-between">
                            <div>
                                <h4 class="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-2">航太精密組件特徵</h4>
                                <div class="text-xs text-slate-400 space-y-2 py-2">
                                    <p>• <b>國防安全合約</b>：漢翔中標「國防教練機戰機案」後，將會獲得特許長約。合約期間完全阻斷大盤景氣衰退，每日穩定挹注現金流入，是抵禦景氣蕭條的防禦神盾。</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } 
            else { // 自行車
                const level = corp.ebikeRndLevel || 1;
                const mult = corp.subModel === 'heavy_ebike' ? 12 : 8;
                return `
                    <div class="panel p-4 border-slate-700 bg-slate-900 bg-opacity-40">
                        <h4 class="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-3">🚲 E-Bike 智慧綠能公路自行車產線</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between text-xs">
                                <span>E-Bike 研發等級:</span>
                                <span class="text-yellow-400 font-bold">LV ${level}</span>
                            </div>
                            <div class="flex justify-between text-xs">
                                <span>綠能自行車銷售溢價:</span>
                                <span class="text-green-400 font-bold">+${level * mult}% 綠色溢價</span>
                            </div>
                            <div class="flex justify-between text-xs">
                                <span>當前經銷商庫存:</span>
                                <span class="${corp.inventoryDays > 40 ? 'text-red-400 font-bold' : 'text-slate-300'}">${corp.inventoryDays || 30} 天</span>
                            </div>

                            <div class="border-t border-slate-800 pt-3 mt-2 space-y-2">
                                ${!isReadOnly ? `
                                    <button class="btn-retro w-full py-2 border-yellow-500 text-yellow-400 hover:bg-yellow-950 text-xs" 
                                        onclick="CEO_AUTO.upgradeEbikeRnd(${app.state.stocks.indexOf(corp)})">
                                        ⚡ 升級 E-Bike 智慧綠能研發 (花費 $7,000,000)
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }
        },

        updateQuotaSliderUI(val) {
            const slider = document.getElementById('heavy-quota-slider');
            if (slider) {
                const prev = slider.previousElementSibling;
                if (prev) {
                    let scarcityPct = 1.0;
                    let priceMult = 1.0;
                    if (val < 300) { scarcityPct = 1.0; priceMult = 1.5; }
                    else if (val < 600) { scarcityPct = 0.95; priceMult = 1.3; }
                    else if (val < 1200) { scarcityPct = 0.70; priceMult = 1.1; }
                    else if (val < 3000) { scarcityPct = 0.40; priceMult = 0.9; }
                    else { scarcityPct = 0.10; priceMult = 0.5; }

                    prev.innerHTML = `<span>年度全球分配配額: ${val} 台</span><span>品牌信仰稀缺度: ${(scarcityPct * 100).toFixed(0)}%</span>`;
                    
                    const next = slider.nextElementSibling;
                    if (next) {
                        next.querySelector('span:last-child').className = priceMult >= 1.3 ? 'text-green-400 font-bold' : priceMult < 0.9 ? 'text-red-400 font-bold' : 'text-slate-300';
                        next.querySelector('span:last-child').innerText = `x${priceMult.toFixed(2)} 售價倍率`;
                    }
                }
            }
        },

        setScarcityQuota(idx) {
            const s = app.state.stocks[idx];
            if (!s) return;

            const slider = document.getElementById('heavy-quota-slider');
            if (!slider) return;

            const val = parseInt(slider.value);
            s.scarcityQuota = val;

            let scarcity = 1.0;
            if (val < 300) scarcity = 1.0;
            else if (val < 600) scarcity = 0.95;
            else if (val < 1200) scarcity = 0.70;
            else if (val < 3000) scarcity = 0.40;
            else scarcity = 0.10;

            s.brandScarcity = scarcity;

            app.log(`【信仰定價】${s.name} 設定年度產量配額為 ${val} 台！信仰稀缺度變更為 ${(scarcity * 100).toFixed(0)}%。`, 'text-yellow');

            app.updateUI();
            this.renderAutoTab(s, document.getElementById('ops-tab-content'), false);
        },

        upgradeHeavyRnd(idx) {
            const s = app.state.stocks[idx];
            if (!s) return;

            const cost = 6000000;
            if (s.corporateCash < cost) {
                app.log("【資金不足】公司帳上現金不足以支付特種研發升級費 ($6,000,000)！", "text-red-400 font-bold");
                return;
            }

            s.corporateCash -= cost;
            s.rndDepth = (s.rndDepth || 1) + 1;

            const bonus = s.subModel === 'heavy_defense' ? 15 : 0;
            app.log(`【特種研發】${s.name} 提升國防重工特種研發深度至等級 ${s.rndDepth}！下一期採購中標機率提升至 ${Math.min(95, 30 + s.rndDepth * 15 + bonus)}%。`, 'text-cyan-400 font-bold');

            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(s.corporateCash);
            app.updateUI();
            this.renderAutoTab(s, document.getElementById('ops-tab-content'), false);
        },

        bidDefenseTender(idx) {
            const s = app.state.stocks[idx];
            if (!s) return;

            const cost = 8000000;
            if (s.corporateCash < cost) {
                app.log("【資金不足】公司帳上現金不足以支付標案保證金與游說費 ($8,000,000)！", "text-red-400 font-bold");
                return;
            }

            s.corporateCash -= cost;
            
            const bonus = s.subModel === 'heavy_defense' ? 0.15 : 0.0;
            const prob = Math.min(0.95, 0.30 + (s.rndDepth || 1) * 0.15 + bonus);
            const isSuccess = Math.random() < prob;

            if (isSuccess) {
                s.defenseTenderDays = s.subModel === 'heavy_defense' ? 150 : 120; // 國防特化 150 天，普通 120 天
                app.log(`【標案中標】🎉 恭喜！${s.name} 成功得標國家國防採購大標案！獲得 ${s.defenseTenderDays} 天特許軍工合約，每日穩定軍工利潤直接注入！`, 'text-magenta font-bold animate-pulse text-lg');
            } else {
                app.log(`【標案流標】遺憾！${s.name} 在本次國防重防務招標中未能得標，投標資金折損。建議提升特種國防研發深度以利下次招標！`, 'text-slate-400');
            }

            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(s.corporateCash);
            app.updateUI();
            this.renderAutoTab(s, document.getElementById('ops-tab-content'), false);
        },

        upgradeEbikeRnd(idx) {
            const s = app.state.stocks[idx];
            if (!s) return;

            const cost = 7000000;
            if (s.corporateCash < cost) {
                app.log("【資金不足】公司帳上現金不足以升級 E-Bike 智慧綠能研發！", "text-red-400 font-bold");
                return;
            }

            s.corporateCash -= cost;
            s.ebikeRndLevel = (s.ebikeRndLevel || 1) + 1;

            const mult = s.subModel === 'heavy_ebike' ? 12 : 8;
            app.log(`【智慧電裝】${s.name} 升級綠能智慧電裝系統至 LV ${s.ebikeRndLevel}！綠色環保銷售溢價提升至 +${s.ebikeRndLevel * mult}%。`, 'text-yellow-400 font-bold');

            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(s.corporateCash);
            app.updateUI();
            this.renderAutoTab(s, document.getElementById('ops-tab-content'), false);
        },

        // ==========================================
        // 9.5 玩家品牌成長與研發技術六大決策函數
        // ==========================================
        buyMarketingAd(corpId) {
            const corp = app.state.stocks.find(s => s.id === corpId);
            if (!corp) return;

            const cost = 2500000;
            if (corp.corporateCash < cost) {
                app.log("【資金不足】公司帳上現金不足以支付投放大眾媒體廣告費用 ($2,500,000)！", "text-red-400 font-bold");
                return;
            }

            corp.corporateCash -= cost;
            corp.brandReputation = Math.min(100, (corp.brandReputation || 10) + 5);

            app.log(`【廣告行銷】📢 ${corp.name} 發起大眾媒體廣告投放，品牌大眾聲譽提升 5 點！目前聲譽值為 ${corp.brandReputation}/100。`, 'text-yellow-400 font-bold');

            // 零延遲刷新 DOM 現金與 UI
            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(corp.corporateCash);
            app.updateUI();
            this.renderAutoTab(corp, document.getElementById('ops-tab-content'), false);
        },

        joinGlobalCarShow(corpId) {
            const corp = app.state.stocks.find(s => s.id === corpId);
            if (!corp) return;

            const cost = 8000000;
            if (corp.corporateCash < cost) {
                app.log("【資金不足】公司帳上現金不足以支付參展全球國際 A 級車展費用 ($8,000,000)！", "text-red-400 font-bold");
                return;
            }

            corp.corporateCash -= cost;
            corp.brandReputation = Math.min(100, (corp.brandReputation || 10) + 18);

            app.log(`【車迷引領】🎪 ${corp.name} 重磅進駐全球 A 級國際車展，發布全新概念車，引爆關注！品牌大眾聲譽提升 18 點！目前聲譽值為 ${corp.brandReputation}/100。`, 'text-yellow-500 font-extrabold animate-pulse');

            // 零延遲刷新 DOM 現金與 UI
            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(corp.corporateCash);
            app.updateUI();
            this.renderAutoTab(corp, document.getElementById('ops-tab-content'), false);
        },

        hireAcademician(corpId) {
            const corp = app.state.stocks.find(s => s.id === corpId);
            if (!corp) return;

            const cost = 10000000;
            if (corp.corporateCash < cost) {
                app.log("【資金不足】公司帳上現金不足以支付聘請技術院士費用 ($10,000,000)！", "text-red-400 font-bold");
                return;
            }

            corp.corporateCash -= cost;
            corp.techStandard = Math.min(10.0, parseFloat(((corp.techStandard || 1.0) + 0.8).toFixed(2)));

            app.log(`【技術院士聘任】🧪 ${corp.name} 高薪聘任國家工程院院士進駐，開啟技術研發攻堅！技術標準提升 0.8 級！目前技術標準為 ${corp.techStandard.toFixed(1)}/10.0。`, 'text-cyan-400 font-bold');

            // 零延遲刷新 DOM 現金與 UI
            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(corp.corporateCash);
            app.updateUI();
            this.renderAutoTab(corp, document.getElementById('ops-tab-content'), false);
        },

        buildTestPlatform(corpId) {
            const corp = app.state.stocks.find(s => s.id === corpId);
            if (!corp) return;

            const cost = 18000000;
            if (corp.corporateCash < cost) {
                app.log("【資金不足】公司帳上現金不足以支付建置精密防撞平台費用 ($18,000,000)！", "text-red-400 font-bold");
                return;
            }

            corp.corporateCash -= cost;
            corp.techStandard = Math.min(10.0, parseFloat(((corp.techStandard || 1.0) + 2.0).toFixed(2)));

            app.log(`【材料與安全測試】🔬 ${corp.name} 精密材料與防撞風洞平台竣工投入營運，大幅加固車輛研發精度！技術標準提升 2.0 級！目前技術標準為 ${corp.techStandard.toFixed(1)}/10.0。`, 'text-cyan-500 font-extrabold animate-pulse');

            // 零延遲刷新 DOM 現金與 UI
            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(corp.corporateCash);
            app.updateUI();
            this.renderAutoTab(corp, document.getElementById('ops-tab-content'), false);
        },

        sponsorF1Team(corpId) {
            const corp = app.state.stocks.find(s => s.id === corpId);
            if (!corp) return;

            const cost = 25000000;
            if (corp.corporateCash < cost) {
                app.log("【資金不足】公司帳上現金不足以支付冠名贊助 F1 全球頂級車隊費用 ($25,000,000)！", "text-red-400 font-bold");
                return;
            }

            corp.corporateCash -= cost;
            corp.luxuryValue = Math.min(100, (corp.luxuryValue || 10) + 25);
            corp.brandReputation = Math.min(100, (corp.brandReputation || 10) + 10);

            app.log(`【賽道信仰】🏎️ ${corp.name} 宣佈數千萬美元冠名贊助 F1 全球頂尖一級方程式車隊，引爆金字塔富豪信仰！產品奢華價值狂飆 25 點，大眾聲譽同步提升 10 點！目前奢華度 ${corp.luxuryValue}/100，聲譽 ${corp.brandReputation}/100。`, 'text-magenta font-extrabold animate-pulse text-lg');

            // 零延遲刷新 DOM 現金與 UI
            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(corp.corporateCash);
            app.updateUI();
            this.renderAutoTab(corp, document.getElementById('ops-tab-content'), false);
        },

        hostEstateParty(corpId) {
            const corp = app.state.stocks.find(s => s.id === corpId);
            if (!corp) return;

            const cost = 5000000;
            if (corp.corporateCash < cost) {
                app.log("【資金不足】公司帳上現金不足以支付舉辦私人莊園奢華酒會費用 ($5,000,000)！", "text-red-400 font-bold");
                return;
            }

            corp.corporateCash -= cost;
            corp.luxuryValue = Math.min(100, (corp.luxuryValue || 10) + 8);

            app.log(`【富豪私享】🥂 ${corp.name} 於阿爾卑斯頂級私人山莊為超級超跑準買主舉辦尊爵酒會！產品奢華價值提升 8 點！目前奢華度 ${corp.luxuryValue}/100。`, 'text-magenta font-bold');

            // 零延遲刷新 DOM 現金與 UI
            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = '$' + app.formatMoney(corp.corporateCash);
            app.updateUI();
            this.renderAutoTab(corp, document.getElementById('ops-tab-content'), false);
        },

        // ==========================================
        // 10. 每日收支結算公式 (processRevenue)
        // ==========================================
        processRevenue(corp) {
            if (!corp) return;

            // 確保初始化與防 NaN
            this.initAssets(corp);

            // 若尚未選擇特化產品線，每日扣減 $30,000 日維持費，不產生 any 營收，直到玩家配置產線
            if (corp.isPlayerFounded && corp.subModel === 'generic') {
                corp.corporateCash = Math.max(0, corp.corporateCash - 30000);
                if (isNaN(corp.corporateCash)) corp.corporateCash = corp.initialCapital || 5000000;
                return;
            }

            // 每日汽車公司品牌聲譽真實口碑自然累積 (每天 15% 機率自然增加 0.1 ~ 0.3 點)
            if (Math.random() < 0.15) {
                const addedRep = parseFloat((0.1 + Math.random() * 0.2).toFixed(2));
                corp.brandReputation = Math.min(100, parseFloat(((corp.brandReputation || 10) + addedRep).toFixed(2)));
            }

            const gci = app.state && app.state.gci !== undefined ? app.state.gci : 1.0; 
            const rate = app.state && app.state.bankRate !== undefined ? app.state.bankRate : 0.05; 

            let oilPrice = 80;
            if (app.state && app.state.oilPrice) {
                oilPrice = app.state.oilPrice;
            } else {
                oilPrice = 80 + Math.sin(app.state.day / 10) * 15;
            }

            let baseRevenue = 0;
            let dailyCost = 150000 + (corp.workerCount * 800); 
            let dailyLogMsg = '';
            
            let priceWarImpact = false;
            app.state.stocks.forEach(x => {
                if (x.sector === 'auto' && x.bizModel === 'ev_innovator' && x.isPriceWar && x.id !== corp.id) {
                    priceWarImpact = true;
                }
            });

            // ------------------------------------------
            // 傳統整車巨頭 (Legacy OEM) 結算
            // ------------------------------------------
            if (corp.bizModel === 'legacy_oem') {
                const evRatio = corp.evRatio || 0.1;
                const iceRatio = 1 - evRatio;

                // 油價蹺蹺板對銷量之衝擊
                let oilImpact = 1.0;
                if (oilPrice > 95) {
                    oilImpact = iceRatio * 0.7 + evRatio * 1.25;
                } else if (oilPrice < 65) {
                    oilImpact = iceRatio * 1.2 + evRatio * 0.9;
                }

                // 基礎營收 (豪華 SUV 特權額外 +20% 營收)
                const revMult = corp.subModel === 'oem_suv' ? 1.20 : 1.0;
                baseRevenue = 3500000 * oilImpact * gci * revMult;

                // 所有汽車大眾乘用車型折算係數 (乘以聲譽/100，大廠起步即高，自創從零點起頭)
                baseRevenue *= (corp.brandReputation || 10) / 100;

                if (priceWarImpact) {
                    baseRevenue *= 0.6; 
                    corp.inventoryDays = Math.min(100, (corp.inventoryDays || 25) + 0.5); 
                } else {
                    const ratePush = rate * 2.5; 
                    const subsidyPull = (corp.dealerSubsidy || 0) * 0.4;
                    corp.inventoryDays = Math.max(10, (corp.inventoryDays || 25) + ratePush - 0.2 - subsidyPull);
                }

                // 庫存天數折舊 (平民轎車特權安全上限提升為 40 天)
                const limit = corp.subModel === 'oem_sedan' ? 40 : 35;
                let inventoryCost = 0;
                if (corp.inventoryDays > limit) {
                    inventoryCost = (corp.inventoryDays - limit) * 80000 * (1 + rate * 3);
                    dailyCost += inventoryCost;
                }

                // 碳稅新規處罰
                if (corp.evRatio < 0.3) {
                    if (Math.random() < 0.3) {
                        corp.carbonTaxFines = 2000000;
                        dailyCost += 2000000;
                        dailyLogMsg += ` 🚨碳稅新規罰款-$2M`;
                    }
                }

                // 商用貨卡特權製造營運折舊降低 15%
                if (corp.subModel === 'oem_truck') {
                    dailyCost = dailyCost * 0.85;
                }

                // 結算
                const netProfit = baseRevenue - dailyCost;
                corp.corporateCash += netProfit;

                if (app.state.day % 7 === 0) {
                    app.log(`⚙️【OEM日結】${corp.name} 出貨中：產線[${corp.customProduct.substring(0,6)}]，經銷商庫存 ${corp.inventoryDays.toFixed(0)}天，當日淨利：+$${app.formatMoney(netProfit)}。${dailyLogMsg}`, netProfit >= 0 ? 'text-slate-300' : 'text-rose-400');
                }
            }
            // ------------------------------------------
            // 新新能源與智能車 (EV Innovator) 結算
            // ------------------------------------------
            else if (corp.bizModel === 'ev_innovator') {
                const factories = corp.gigaFactories || 1;
                // 純電平民房車特權：超級工廠成本減免從 5% 升至 7%
                const mult = corp.subModel === 'ev_sedan' ? 7 : 5;
                const limit = corp.subModel === 'ev_sedan' ? 45 : 40;
                const reduction = Math.min(limit, factories * mult);
                const factoryCostMod = 1 - (reduction / 100);

                let priceWarMultiplier = corp.isPriceWar ? 1.4 : 1.0; 
                let oilImpact = 1.0;
                if (oilPrice > 95) oilImpact = 1.25; 

                // 重型皮卡特權基礎營收 +25%
                const revMult = corp.subModel === 'ev_truck' ? 1.25 : 1.0;
                baseRevenue = 4500000 * oilImpact * priceWarMultiplier * gci * revMult;

                // 所有純電車款買氣折損 (乘以聲譽/100)
                baseRevenue *= (corp.brandReputation || 10) / 100;

                let manufactureCost = 3000000 * factoryCostMod;
                if (corp.isPriceWar) manufactureCost *= 1.1; 

                dailyCost += manufactureCost;

                // FSD 訂閱
                const rep = corp.brandReputation || 80;
                // 智能旗艦特權：初始滲透率從 15% 起跳且滲透率增長快 30%
                const fsdTargetPen = Math.min(1.0, (rep / 100) * (300000 / (corp.fsdPrice || 250000)));
                const speed = corp.subModel === 'ev_flagship' ? 0.026 : 0.02;
                corp.fsdPenetration = (corp.fsdPenetration || 0.05) + (fsdTargetPen - (corp.fsdPenetration || 0.05)) * speed;

                // 所有新能源車的 FSD 訂閱率上限，皆受到技術標準 (techStandard * 10%) 之安全限制 (FSD 安全防線)
                const maxFsdPen = (corp.techStandard || 1.0) * 0.1;
                corp.fsdPenetration = Math.min(corp.fsdPenetration, maxFsdPen);

                const fsdSubscribers = Math.floor(corp.fsdPenetration * 20000);
                const fsdRevenue = fsdSubscribers * ((corp.fsdPrice || 250000) * 0.0001); 
                
                baseRevenue += fsdRevenue;

                const netProfit = baseRevenue - dailyCost;
                corp.corporateCash += netProfit;

                if (app.state.day % 7 === 0) {
                    app.log(`⚡【EV日結】${corp.name} 生產中：廠房 ${factories}座，FSD訂閱率 ${(corp.fsdPenetration * 100).toFixed(1)}% (帶來日收 $${app.formatMoney(fsdRevenue)})，當日淨利：+$${app.formatMoney(netProfit)}。`, netProfit >= 0 ? 'text-cyan-400' : 'text-rose-400');
                }
            }
            // ------------------------------------------
            // 汽車零組件與 AM 碰撞件 (Tier 1 & AM) 結算
            // ------------------------------------------
            else if (corp.bizModel === 'tier1_am') {
                const contracts = corp.oemContracts || 1;
                const molds = corp.amMolds || 2;

                // 傳動齒輪特權：長約折價砍價折半
                const costDownPct = (corp.oemCostDownYears || 0) * (corp.subModel === 'am_gears' ? 2.5 : 5);
                const oemDailyRev = contracts * 1200000 * (1 - costDownPct/100);

                // 外觀件特權：AM 售後銷售溢價 +15%
                const revMult = corp.subModel === 'am_lights' ? 1.15 : 1.0;
                let amDailyRev = molds * 750000 * gci * revMult;

                // 售後市場 AM 碰撞件深受大眾品牌聲譽係數之折損！(OEM 長約是 B2B 長期品質認證不受折損，完美體現精確商業規則)
                amDailyRev *= (corp.brandReputation || 10) / 100;

                baseRevenue = oemDailyRev + amDailyRev;

                // 隨機原廠專利侵權起訴
                if (Math.random() < corp.lawsuitRisk * 0.05) { 
                    // 雷達電子特權：訴訟罰賠金額減半
                    const basePen = corp.subModel === 'am_radar' ? 5000000 : 10000000;
                    const randPen = corp.subModel === 'am_radar' ? 7500000 : 15000000;
                    const penalty = basePen + Math.floor(Math.random() * randPen);
                    
                    dailyCost += penalty;
                    corp.lawsuitRisk = Math.max(0.02, corp.lawsuitRisk - 0.1); 
                    app.log(`🚨【專利起訴】原廠控告 ${corp.name} 專利侵權！法院強制一次性判賠罰款 $${app.formatMoney(penalty)}！`, 'text-red-400 font-extrabold animate-pulse text-lg');
                }

                const netProfit = baseRevenue - dailyCost;
                corp.corporateCash += netProfit;

                if (app.state.day % 7 === 0) {
                    app.log(`⚙️【零件日結】${corp.name} 出貨中：產線[${corp.customProduct.substring(0,6)}]，OEM長約 ${contracts}，專利侵權風險 ${(corp.lawsuitRisk*100).toFixed(0)}%，當日淨利：+$${app.formatMoney(netProfit)}。`, netProfit >= 0 ? 'text-slate-300' : 'text-rose-400');
                }
            }
            // ------------------------------------------
            // 特種車與重型工業 (Specialty & Heavy) 結算
            // ------------------------------------------
            else if (corp.bizModel === 'specialty_heavy') {
                if (corp.id === 'RACE' || corp.subModel === 'heavy_supercar') { // 超跑
                    const quota = corp.scarcityQuota || 500;
                    
                    let priceMult = 1.0;
                    const bonus = corp.subModel === 'heavy_supercar' ? 0.1 : 0.0;
                    if (quota < 300) priceMult = 1.5 + bonus;
                    else if (quota < 600) priceMult = 1.3 + bonus;
                    else if (quota < 1200) priceMult = 1.1 + bonus;
                    else if (quota < 3000) priceMult = 0.9 + bonus;
                    else priceMult = 0.5;

                    // 大幅提升超跑單車營收基數至 $280,000 元！並大幅減半超跑日常營運折舊支出
                    baseRevenue = quota * 280000 * priceMult * gci * 0.01; 

                    // 奢華頂級超跑銷售折損 (乘以奢華價值 luxuryValue/100，富豪極重品牌奢侈信仰)
                    baseRevenue *= (corp.luxuryValue || 10) / 100;

                    dailyCost = 60000 + (quota * 10000 * 0.01); // 固定維持僅 6 萬，製造費用按配額比例

                    const netProfit = baseRevenue - dailyCost;
                    corp.corporateCash += netProfit;

                    if (app.state.day % 7 === 0) {
                        app.log(`🏎️【超跑日結】${corp.name} 出貨中：年度超跑配額 ${quota}台，信仰溢價 x${priceMult.toFixed(2)}，當日淨利：+$${app.formatMoney(netProfit)}。`, 'text-red-400 font-bold');
                    }
                } 
                else if (corp.id === '2634' || corp.subModel === 'heavy_defense') { // 軍工
                    if (corp.defenseTenderDays > 0) {
                        baseRevenue = 4000000; 
                        dailyCost = 1000000; 
                        corp.defenseTenderDays--;
                        
                        if (corp.defenseTenderDays === 0) {
                            app.log(`🛡️【國防合約】${corp.name} 特許防務軍工大採購標案合約到期結束，重返民航代工常規市場。`, 'text-yellow font-bold');
                        }
                    } else {
                        baseRevenue = 1500000 * gci; 
                        dailyCost = 1000000;
                    }

                    // 國防標案特許訂單為 B2G 特種中標，不乘名聲或奢華折算，完美維持國家標案穩定性！
                    const netProfit = baseRevenue - dailyCost;
                    corp.corporateCash += netProfit;

                    if (app.state.day % 7 === 0) {
                        app.log(`✈️【重工日結】${corp.name} 生產中：國防標案特許剩餘 ${corp.defenseTenderDays}天，當日淨利：+$${app.formatMoney(netProfit)}。`, 'text-cyan-400');
                    }
                } 
                else { // 自行車 (巨大/美利達 或 自行車特化)
                    const level = corp.ebikeRndLevel || 1;
                    const mult = corp.subModel === 'heavy_ebike' ? 0.12 : 0.08;
                    const greenPremium = 1 + (level * mult); 

                    baseRevenue = 2000000 * greenPremium * gci;

                    // 智慧綠能公路自行車大眾消費市場折算 (乘以大眾聲譽 brandReputation/100)
                    baseRevenue *= (corp.brandReputation || 10) / 100;

                    dailyCost = 150000 + (corp.workerCount * 800) + 1000000; // 修正累積成本支出，確保利潤正常

                    const ratePush = rate * 2.0;
                    corp.inventoryDays = Math.max(10, (corp.inventoryDays || 30) + ratePush - 0.5);

                    if (corp.inventoryDays > 40) {
                        dailyCost += (corp.inventoryDays - 40) * 30000;
                    }

                    const netProfit = baseRevenue - dailyCost;
                    corp.corporateCash += netProfit;

                    if (app.state.day % 7 === 0) {
                        app.log(`🚲【自行車日結】${corp.name} 生產中：E-Bike LV ${level}，當日淨利：+$${app.formatMoney(netProfit)}。`, 'text-green-400');
                    }
                }
            }

            // 確保 corporateCash 防 NaN，徹底根絕污染
            if (isNaN(corp.corporateCash)) {
                corp.corporateCash = corp.initialCapital || 5000000;
            }

            // 💡 寫入核心營運日常收益與開銷，供現金流明細呈現
            if (typeof baseRevenue !== 'undefined' && typeof dailyCost !== 'undefined') {
                corp.lastDailyRev = baseRevenue;
                corp.lastDailyExp = dailyCost;
            }
        }
    };

    window.CEO_AUTO = CEO_AUTO;
})();
