// ceo_realestate.js - 營建不動產板塊：四大開發模型與三大成長解鎖系統實作

const CEO_REALESTATE = {
    // 1. 初始化屬性與變數
    initAssets(corp) {
        if (corp.isPlayerFounded) {
            // 玩家創立公司強制從零起步，徹底貫徹白手起家熱血奮鬥感！
            corp.brandReputation = 10;   // 品牌聲譽值 (起點 10)
            corp.techStandard = 1.0;     // 工程安全標準 (起點 1.0)
            corp.luxuryValue = 10;       // 地段美學價值 (起點 10)
            corp.realestateSpecialty = 'none'; // 12種生產線二次特化
        } else {
            // 大廠配置高保真初始定位，根據其 ID 與地位分配合理變數
            const customInitialData = {
                '2501': { reputation: 80, tech: 3.5, luxury: 40, spec: 'classic_res' },   // 國建
                '2542': { reputation: 90, tech: 2.8, luxury: 30, spec: 'giant_township' }, // 興富發
                '5522': { reputation: 75, tech: 4.2, luxury: 50, spec: 'bot_stadium' },    // 遠雄
                '2548': { reputation: 85, tech: 4.5, luxury: 60, spec: 'smart_office' },   // 華固
                '5534': { reputation: 80, tech: 4.0, luxury: 65, spec: 'premium_office' }, // 長虹
                '9945': { reputation: 95, tech: 5.0, luxury: 70, spec: 'complex_transit' },// 潤泰新
                '2545': { reputation: 70, tech: 3.0, luxury: 95, spec: 'luxury_mansion' },  // 皇翔
                '2520': { reputation: 80, tech: 3.8, luxury: 55, spec: 'tod_retail' },     // 冠德
                '2524': { reputation: 65, tech: 2.5, luxury: 80, spec: 'scenic_mansion' },  // 京城
                '2547': { reputation: 70, tech: 3.6, luxury: 45, spec: 'bot_subway' },     // 日勝生
                '6177': { reputation: 75, tech: 3.2, luxury: 35, spec: 'science_park' },   // 達麗
                '2536': { reputation: 70, tech: 3.5, luxury: 50, spec: 'shared_office' },   // 宏普
                '5531': { reputation: 60, tech: 2.0, luxury: 85, spec: 'resort_villa' },    // 鄉林
                '2546': { reputation: 90, tech: 4.8, luxury: 25, spec: 'infra_contract' }   // 根基
            };

            const data = customInitialData[corp.id] || { reputation: 50, tech: 2.5, luxury: 30, spec: 'none' };
            corp.brandReputation = data.reputation;
            corp.techStandard = data.tech;
            corp.luxuryValue = data.luxury;
            corp.realestateSpecialty = data.spec;
        }

        // 初始化通用營建專用欄位
        corp.residentialProjects = []; // 預售建案清單 { id, name, cost, preSaleRate, daysLeft, targetRevenue }
        corp.commercialRentals = [];   // 商辦招租清單 { id, name, cost, occupancy, size, rentDaily }
        corp.activeContracts = [];     // 營造工程承攬合約 { id, name, value, progress, rawCost, isHedged }
        corp.todCenters = [];          // TOD 共構與 BOT 項目 { id, name, cost, footprint, dailyRent, customerRep }
        
        corp.hedgeCementAndSteel = false; // 原物料避險開關
        corp.reitsEstablished = false;     // 是否成立 REITs 證券化
        corp.landCount = 0;               // 當前標得的土地數量
    },

    // 2. 六大現鈔決策 API (確保即時扣款與 DOM 零延遲刷新)
    executeDecision(corpId, decisionKey) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        const decisions = {
            'ad': { cost: 2500000, brand: 5, tech: 0, luxury: 0, msg: '投放大眾地產廣告' },
            'expo': { cost: 8000000, brand: 18, tech: 0, luxury: 0, msg: '舉辦都更說明會與推案發布會' },
            'expert': { cost: 10000000, brand: 0, tech: 0.8, luxury: 0, msg: '聘任國家結構力學院士' },
            'bim': { cost: 18000000, brand: 0, tech: 2.0, luxury: 0, msg: '引進 3D BIM 智慧營建設計系統' },
            'architect': { cost: 25000000, brand: 10, tech: 0, luxury: 25, msg: '聯名國際地標建築大師設計' },
            'wine': { cost: 5000000, brand: 0, tech: 0, luxury: 8, msg: '舉辦私人頂豪別墅莊園品酒會' }
        };

        const d = decisions[decisionKey];
        if (!d) return;

        if (corp.corporateCash < d.cost) {
            app.log(`【資金不足】${corp.name} 帳上現金不足以支付 ${d.msg} 的預算！`, "text-red-500 font-bold");
            return;
        }

        // 扣除現金與增加屬性
        corp.corporateCash -= d.cost;
        corp.brandReputation = Math.min(100, corp.brandReputation + d.brand);
        corp.techStandard = Math.min(10.0, corp.techStandard + d.tech);
        corp.luxuryValue = Math.min(100, corp.luxuryValue + d.luxury);

        app.log(`【經營決策】${corp.name} 耗資 $${app.formatMoney(d.cost)} ${d.msg}！(聲譽 +${d.brand}, 安全標準 +${d.tech}, 美學價值 +${d.luxury})`, "text-green-400 font-bold");

        // 零延遲刷新現金 DOM 與面板 UI
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        
        const contentArea = document.getElementById('ceo-content-area');
        if (contentArea) {
            this.renderRealestateTab(corp, contentArea, false);
        }
    },

    // 3. 配置生產線二次特化 (開工建線費 $2.0M)
    configureSpecialty(corpId, specKey) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        const specCost = 2000000; // 開工配置規費
        if (corp.corporateCash < specCost) {
            app.log(`【資金不足】${corp.name} 帳上現金不足 $${app.formatMoney(specCost)}，無法變更二次生產線特化！`, "text-red-500 font-bold");
            return;
        }

        corp.corporateCash -= specCost;
        corp.realestateSpecialty = specKey;

        app.log(`【生產特化】${corp.name} 耗資 $${app.formatMoney(specCost)} 成功轉型配置二次特化生產線！`, "text-cyan font-bold");

        // 零延遲刷新
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        const contentArea = document.getElementById('ceo-content-area');
        if (contentArea) {
            this.renderRealestateTab(corp, contentArea, false);
        }
    },

    // 4. 捷運與政府 BOT 投標、商場招商、土建融獵地等 API 介面
    buyLand(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        // 連動金融業流動性 (若 finance 平均股價暴跌，則銀行鎖死獵地/推案按鈕)
        const financeSector = app.state.stocks.filter(st => st.sector === 'finance');
        const avgFinPrice = financeSector.length > 0 ? (financeSector.reduce((sum, current) => sum + current.price, 0) / financeSector.length) : 100;
        if (avgFinPrice < 20) {
            app.log("【融資凍結】金融業流動性危機爆發！銀行雨天收傘，全面凍結土建融放貸，您暫時無法獵地與推案！", "text-red-500 font-bold animate-pulse");
            return;
        }

        const landCost = 10000000; // 土地融資自備款 1000 萬
        if (corp.corporateCash < landCost) {
            app.log(`【資金不足】帳上自備款不足 $${app.formatMoney(landCost)}，無法向銀行融資獵地！`, "text-red-500 font-bold");
            return;
        }

        corp.corporateCash -= landCost;
        corp.landCount = (corp.landCount || 0) + 1;

        app.log(`【重劃區推案】${corp.name} 成功於精華重劃區取得一塊指標性土地庫存！(土地數量: ${corp.landCount})`, "text-yellow font-bold");

        // 零延遲刷新
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        const contentArea = document.getElementById('ceo-content-area');
        if (contentArea) {
            this.renderRealestateTab(corp, contentArea, false);
        }
    },

    launchResidentialProject(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        if (!corp.landCount || corp.landCount <= 0) {
            app.log("【無地可蓋】您必須先獵地取得重劃區土地，方可啟動預售建案！", "text-red-500 font-bold");
            return;
        }

        // 開工建案保證金與起跑利息規費
        const startCost = 5000000; 
        if (corp.corporateCash < startCost) {
            app.log(`【資金不足】啟動預售案需支付開工準備金 $${app.formatMoney(startCost)}！`, "text-red-500 font-bold");
            return;
        }

        corp.corporateCash -= startCost;
        corp.landCount--;

        // 計算初始預售銷售成數 (受品牌聲譽與利率政策強烈製約)
        const rate = (typeof app.state.interestRate !== 'undefined') ? app.state.interestRate : 0.02;
        let preSale = 0.3 + (corp.brandReputation / 250);
        // 地獄級利率敏感度連動 (利率 > 5.0% 或升息)
        if (rate > 0.05) {
            preSale *= 0.2; // 買氣暴跌 80%
        }

        preSale = Math.min(0.99, Math.max(0.05, preSale));

        // 專案名稱
        const pNames = ["【雙捷共構】富貴天閣一期", "【科學園區】青年首購大鎮", "【美學帝標】大師奢華臻邸", "【重劃都更】富饒新城"];
        const pName = pNames[Math.floor(Math.random() * pNames.length)];

        corp.residentialProjects.push({
            id: `RES-${Date.now()}`,
            name: pName,
            preSaleRate: preSale,
            daysLeft: 120, // 3年完工 (120日)
            targetRevenue: 80000000 + (corp.luxuryValue * 1500000) // 奢華越高，完工總銷額越高
        });

        app.log(`【預售啟動】${corp.name} 啟動「${pName}」預售吸金大案！預售簽約率達 ${(preSale*100).toFixed(1)}%！`, "text-green-400 font-bold");

        // 零延遲刷新
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        const contentArea = document.getElementById('ceo-content-area');
        if (contentArea) {
            this.renderRealestateTab(corp, contentArea, false);
        }
    },

    buildCommercialOffice(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        const buildCost = 25000000; // 興建頂級商辦費用
        if (corp.corporateCash < buildCost) {
            app.log(`【資金不足】興建頂級商辦大樓需支付 $${app.formatMoney(buildCost)}！`, "text-red-500 font-bold");
            return;
        }

        corp.corporateCash -= buildCost;

        // 自動推入商辦招租清單，等待選擇「整棟出售」或「REITs 證券化」
        const name = "南港頂級A級智慧科技商辦大樓";
        corp.commercialRentals.push({
            id: `COM-${Date.now()}`,
            name: name,
            occupancy: 0.8 + (corp.luxuryValue / 500), // 美學指標加成招租率
            rentDaily: 500000 + (corp.luxuryValue * 10000) // 每日租金收益
        });

        app.log(`【商辦落成】${corp.name} 投資 $${app.formatMoney(buildCost)} 興建的「${name}」正式落成！`, "text-cyan font-bold");

        // 零延遲刷新
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        const contentArea = document.getElementById('ceo-content-area');
        if (contentArea) {
            this.renderRealestateTab(corp, contentArea, false);
        }
    },

    sellCommercialWhole(corpId, projId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        const idx = corp.commercialRentals.findIndex(p => p.id === projId);
        if (idx === -1) return;

        const proj = corp.commercialRentals[idx];
        const sellValue = 60000000 + (corp.luxuryValue * 500000); // 瞬間收回海量現金
        corp.corporateCash += sellValue;
        corp.commercialRentals.splice(idx, 1);

        app.log(`【B2B整棟出售】${corp.name} 成功將「${proj.name}」以 $${app.formatMoney(sellValue)} 整棟打包轉售給保險金控！瞬間收回海量自備款！`, "text-yellow font-bold");

        // 零延遲刷新
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        const contentArea = document.getElementById('ceo-content-area');
        if (contentArea) {
            this.renderRealestateTab(corp, contentArea, false);
        }
    },

    convertCommercialToREITs(corpId, projId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        const proj = corp.commercialRentals.find(p => p.id === projId);
        if (!proj) return;

        // 成立 REITs，標記已上市，為未來 20 年提供不可拔除的穩定現金流！
        proj.isREITs = true;
        corp.reitsEstablished = true;

        app.log(`【資產證券化】${corp.name} 指標案「${proj.name}」成功發行 REITs 證券化上市！這將是極佳的熊市避風港！`, "text-magenta font-bold");

        const contentArea = document.getElementById('ceo-content-area');
        if (contentArea) {
            this.renderRealestateTab(corp, contentArea, false);
        }
    },

    toggleHedge(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        if (!corp.hedgeCementAndSteel) {
            const hedgeDeposit = 1500000; // 避險保證金
            if (corp.corporateCash < hedgeDeposit) {
                app.log(`【資金不足】啟動鋼筋水泥避險合約需要 $${app.formatMoney(hedgeDeposit)} 存入期貨信託帳戶！`, "text-red-500 font-bold");
                return;
            }
            corp.corporateCash -= hedgeDeposit;
            corp.hedgeCementAndSteel = true;
            app.log(`【物料避險】${corp.name} 成功鎖定本季度鋼筋水泥大宗期貨價格，工期內免疫原物料暴漲通膨！`, "text-green-400 font-bold");
        } else {
            corp.hedgeCementAndSteel = false;
            app.log(`【解除避險】${corp.name} 已退出原物料避險合約。`, "text-yellow");
        }

        // 零延遲刷新
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        const contentArea = document.getElementById('ceo-content-area');
        if (contentArea) {
            this.renderRealestateTab(corp, contentArea, false);
        }
    },

    bidSocialHousingContract(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        // 純代工需滿足工程安全標準 qualification
        const requiredTech = 3.0 + (corp.activeContracts ? corp.activeContracts.length * 1.5 : 0);
        if (corp.techStandard < requiredTech) {
            app.log(`【投標資格不足】您的工程安全標準 (${corp.techStandard.toFixed(1)}) 低於本次標案門檻 (${requiredTech.toFixed(1)})，投標被政府退回！`, "text-red-500 font-bold animate-pulse");
            return;
        }

        // 取得合約
        const val = 12000000; // 工程總額
        if (!corp.activeContracts) corp.activeContracts = [];
        corp.activeContracts.push({
            id: `CON-${Date.now()}`,
            name: `國家社會住宅第 ${corp.activeContracts.length + 1} 期公共營造工程`,
            value: val,
            progress: 0
        });

        app.log(`【中標喜訊】${corp.name} 成功得標「社會住宅與都更招標公共營造工程案」！總值 $${app.formatMoney(val)}！`, "text-cyan font-bold");

        const contentArea = document.getElementById('ceo-content-area');
        if (contentArea) {
            this.renderRealestateTab(corp, contentArea, false);
        }
    },

    bidTransitBOT(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        const bidCost = 15000000; // BOT 投標與開工金
        if (corp.corporateCash < bidCost) {
            app.log(`【資金不足】參與捷運 TOD 共構 BOT 投標需支付履約保證金 $${app.formatMoney(bidCost)}！`, "text-red-500 font-bold");
            return;
        }

        corp.corporateCash -= bidCost;
        if (!corp.todCenters) corp.todCenters = [];
        corp.todCenters.push({
            id: `TOD-${Date.now()}`,
            name: `Global Mall 環球購物中心捷運共構商場 TOD`,
            dailyRent: 150000 + (corp.luxuryValue * 5000), // 每日穩定租金
            customerRep: corp.brandReputation
        });

        app.log(`【BOT 得標】${corp.name} 成功以 $${app.formatMoney(bidCost)} 奪下政府「捷運共構 TOD 商場開發 BOT 案」特許經營權！`, "text-magenta font-bold");

        // 零延遲刷新
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        const contentArea = document.getElementById('ceo-content-area');
        if (contentArea) {
            this.renderRealestateTab(corp, contentArea, false);
        }
    },

    // 5. 每日結算公式核心實作 (完工認列、避險成效、呆帳倒灌等)
    processRevenue(corp) {
        if (!corp.bizModel) return;

        // 確保初始化與防 NaN 自我修復
        if (corp.residentialProjects === undefined) {
            this.initAssets(corp);
        }

        // 大廠高保真自動 AI 營運推進邏輯 (讓 14 家本土大廠有源源不絕的專案與收入)
        if (!corp.isPlayerFounded) {
            // 2.1 住宅建商 AI 自動獵地與推案
            if (corp.bizModel === 'residential_dev') {
                // 如果無土地庫存且在建建案少於 3 個，每天 1.5% 機率自動獵地
                if ((corp.landCount || 0) === 0 && (corp.residentialProjects || []).length < 3) {
                    if (Math.random() < 0.015) {
                        corp.landCount = (corp.landCount || 0) + 1;
                    }
                }
                // 如果有土地庫存，每天 3% 機率自動啟動預售案
                if ((corp.landCount || 0) > 0) {
                    if (Math.random() < 0.03) {
                        corp.landCount--;
                        const preSale = Math.min(0.99, Math.max(0.3, 0.4 + (corp.brandReputation / 250)));
                        const pNames = ["【大廠指標】國華天際特區", "【高鐵特區】宏圖大鎮", "【捷運帝標】世紀臻邸", "【都更指標】富盛新城"];
                        const pName = pNames[Math.floor(Math.random() * pNames.length)];
                        if (!corp.residentialProjects) corp.residentialProjects = [];
                        corp.residentialProjects.push({
                            id: `RES-AI-${Date.now()}-${Math.random()}`,
                            name: pName,
                            preSaleRate: preSale,
                            daysLeft: 120,
                            targetRevenue: 80000000 + (corp.luxuryValue * 1500000)
                        });
                    }
                }
            }

            // 2.2 商廠辦建商 AI 自動蓋樓與資本運作 (發行 REITs 或整棟出售)
            if (corp.bizModel === 'commercial_dev') {
                // 如果旗下商辦少於 2 個，每天 1.2% 機率自動興建一個商辦
                if ((corp.commercialRentals || []).length < 2) {
                    if (Math.random() < 0.012) {
                        if (!corp.commercialRentals) corp.commercialRentals = [];
                        corp.commercialRentals.push({
                            id: `COM-AI-${Date.now()}-${Math.random()}`,
                            name: "大廠A級旗艦科技總部大樓",
                            occupancy: 0.8 + (corp.luxuryValue / 500),
                            rentDaily: 500000 + (corp.luxuryValue * 10000),
                            isREITs: false
                        });
                    }
                }
                // 自持商辦隨機打包出售或發行 REITs (每天 2% 隨機對其中一個未上市商辦進行操作)
                if ((corp.commercialRentals || []).length > 0) {
                    const unmanaged = corp.commercialRentals.filter(p => !p.isREITs);
                    if (unmanaged.length > 0 && Math.random() < 0.02) {
                        const target = unmanaged[Math.floor(Math.random() * unmanaged.length)];
                        if (Math.random() < 0.5) {
                            // 整棟出售
                            const sellValue = 60000000 + (corp.luxuryValue * 500000);
                            corp.corporateCash = (corp.corporateCash || 0) + sellValue;
                            corp.commercialRentals = corp.commercialRentals.filter(p => p.id !== target.id);
                            if (!corp.companyNews) corp.companyNews = [];
                            corp.companyNews.push({
                                date: app.formatDateStr(app.state.date).substring(5),
                                msg: `🏢【大B2B資產處分】本公司成功將「${target.name}」整棟打包出售，獲利 $${app.formatMoney(sellValue)}！`,
                                isGood: true
                            });
                        } else {
                            // 發行 REITs
                            target.isREITs = true;
                            corp.reitsEstablished = true;
                            if (!corp.companyNews) corp.companyNews = [];
                            corp.companyNews.push({
                                date: app.formatDateStr(app.state.date).substring(5),
                                msg: `📈【證券化捷報】旗下「${target.name}」成功發行 REITs 證券化上市，提供極致穩定的永續收租！`,
                                isGood: true
                            });
                        }
                    }
                }
            }

            // 2.3 營造代工 AI 自動標案與避險
            if (corp.bizModel === 'contractor') {
                // 如果合約少於 3 個，每天 2.5% 機率自動中標工程
                if ((corp.activeContracts || []).length < 3) {
                    if (Math.random() < 0.025) {
                        if (!corp.activeContracts) corp.activeContracts = [];
                        const val = 12000000;
                        corp.activeContracts.push({
                            id: `CON-AI-${Date.now()}-${Math.random()}`,
                            name: `大廠中標：國家社會住宅公共營建第 ${(corp.activeContracts.length + 1)} 期`,
                            value: val,
                            progress: 0
                        });
                    }
                }
                // 原物料避險決策 (通膨時 80% 自動避險，平穩時隨機關閉)
                const isInflation = (typeof app.state.energyTrend !== 'undefined' && app.state.energyTrend > 1.2);
                if (isInflation && !corp.hedgeCementAndSteel && Math.random() < 0.05) {
                    corp.hedgeCementAndSteel = true; // 自動開啟避險
                } else if (!isInflation && corp.hedgeCementAndSteel && Math.random() < 0.02) {
                    corp.hedgeCementAndSteel = false; // 自動關閉避險
                }
            }

            // 2.4 TOD 特許共構商場 AI 自動標案
            if (corp.bizModel === 'asset_tod') {
                // 如果 TOD 商場少於 2 個，每天 0.8% 機率自動競得一個捷運 BOT 特許案
                if ((corp.todCenters || []).length < 2) {
                    if (Math.random() < 0.008) {
                        if (!corp.todCenters) corp.todCenters = [];
                        corp.todCenters.push({
                            id: `TOD-AI-${Date.now()}-${Math.random()}`,
                            name: `大廠得標：環球購物中心捷運共構商場特許開發`,
                            dailyRent: 150000 + (corp.luxuryValue * 5000),
                            customerRep: corp.brandReputation || 50
                        });
                    }
                }
            }
        }

        let dailyRev = 0;
        let dailyExp = 0;

        // 取得當前利率與景氣
        const rate = (typeof app.state.interestRate !== 'undefined') ? app.state.interestRate : 0.02;

        // 1. 住宅建商住宅開發住宅完工認列模型
        if (corp.bizModel === 'residential_dev' && corp.residentialProjects) {
            const activeProjects = [];
            corp.residentialProjects.forEach((proj) => {
                proj.daysLeft--;
                // 日常利息支出連動 (土地庫存與融資息)
                const interestPayment = Math.floor(proj.targetRevenue * 0.2 * (rate / 365));
                dailyExp += interestPayment;

                // 到期完工，一次性認列巨額營收
                if (proj.daysLeft <= 0) {
                    const finalRevenue = proj.targetRevenue * proj.preSaleRate;
                    dailyRev += finalRevenue;
                    app.log(`🎉【完工認列暴衝】${corp.name} 承造的「${proj.name}」完工交屋認列！瞬間灌入龐大營收 $${app.formatMoney(finalRevenue)}！股價即將狂飆！`, "text-yellow font-bold text-lg animate-bounce");
                } else {
                    activeProjects.push(proj);
                }
            });
            corp.residentialProjects = activeProjects;

            // 隨機黑天鵝防錯：若建商不幸因為資金鏈斷裂破產（現鈔 < 0），觸發爛尾樓倒閉
            if (corp.corporateCash < 0) {
                const badDebt = 35000000; // 3500萬土建融呆帳
                corp.corporateCash = 0; // 清零
                corp.residentialProjects = []; // 專案全部變爛尾樓清空

                // 呆帳以 3.0 倍率倒灌進入金融板塊所有公司利潤中扣減！
                const financeCorps = app.state.stocks.filter(s => s.sector === 'finance');
                if (financeCorps.length > 0) {
                    financeCorps.forEach(fin => {
                        const fineAmt = Math.floor(badDebt * 3.0 / financeCorps.length);
                        fin.corporateCash = Math.max(0, fin.corporateCash - fineAmt);
                        if (fin.monthRevenue) fin.monthRevenue -= fineAmt;
                        
                        if (!fin.companyNews) fin.companyNews = [];
                        fin.companyNews.push({
                            date: app.formatDateStr(app.state.date).substring(5),
                            msg: `⚠️【系統危機】營建業爛尾樓爆發！土建融呆帳以 3 倍懲罰性倒灌，本金控被重扣 $${app.formatMoney(fineAmt)}！`,
                            isGood: false
                        });
                    });
                }
                app.log(`🚨【金融風暴】${corp.name} 現金流耗盡宣告破產，重劃區建案全數淪為爛尾樓！呆帳以 3.0 倍率血洗倒灌金融板塊！`, "text-red-500 font-bold animate-pulse text-lg");
            }
        }

        // 2. 商辦廠辦與 REITs 證券化模型
        if (corp.bizModel === 'commercial_dev' && corp.commercialRentals) {
            corp.commercialRentals.forEach(proj => {
                if (proj.isREITs) {
                    // REITs 每日產生高額滿租租金收益 (抗景氣抗通膨)
                    const rent = Math.floor(proj.rentDaily * proj.occupancy);
                    dailyRev += rent;
                } else {
                    // 平時未發行 REITs 也未售出前，每日需負擔少量管銷折舊
                    dailyExp += 120000;
                }
            });
        }

        // 3. 營造工程代工與避險工程承攬模型
        if (corp.bizModel === 'contractor' && corp.activeContracts) {
            const isInflation = (typeof app.state.energyTrend !== 'undefined' && app.state.energyTrend > 1.2); // 當原料價格大漲
            const activeContracts = [];

            corp.activeContracts.forEach((contract) => {
                contract.progress += 2.5; // 工程進度

                // 每日工程基準代工收益 (約 3.5% 毛利)
                let margin = 0.035;

                // 若原物料暴漲且未進行避險
                if (isInflation && !corp.hedgeCementAndSteel) {
                    margin = -0.06; // 原物料暴漲導致賠錢代工
                    dailyExp += Math.floor(contract.value / 40 * 0.08);
                }

                // 缺工折損懲罰 (品牌聲譽太低或編制不足)
                if (corp.brandReputation < 30) {
                    contract.progress -= 0.5; // 工期延宕
                }

                const income = Math.floor(contract.value / 40 * (1 + margin));
                dailyRev += income;

                if (contract.progress >= 100) {
                    app.log(`🏗️【工期完工】${corp.name} 指標營造工程「${contract.name}」順利完工交屋驗收！`, "text-cyan");
                } else {
                    activeContracts.push(contract);
                }
            });
            corp.activeContracts = activeContracts;
        }

        // 4. TOD 與捷運共構商場開發模型
        if (corp.bizModel === 'asset_tod' && corp.todCenters) {
            corp.todCenters.forEach(tod => {
                // 每期產生高達 80% 毛利率的穩定收租防禦，不論牛熊市！
                dailyRev += tod.dailyRent;
                dailyExp += Math.floor(tod.dailyRent * 0.2); // 20% 維運管銷
            });
        }

        // 5. 整合與寫入
        const dailyNet = dailyRev - dailyExp;
        corp.corporateCash = (corp.corporateCash || 0) + dailyNet;
        corp.monthRevenue = (corp.monthRevenue || 0) + dailyRev;
        corp.monthExpense = (corp.monthExpense || 0) + dailyExp;
        corp.lastDailyRev = dailyRev;
        corp.lastDailyExp = dailyExp;

        // 連動即時刷新 DOM 現金 (如果是玩家選取的那家公司)
        if (CEO_MODULE.currentCompanyIdx !== null && app.state.stocks[CEO_MODULE.currentCompanyIdx].id === corp.id) {
            const cashEl = document.getElementById('ceo-company-cash');
            if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        }
    },

    // 6. 渲染 UI 面板 (頂部進度、二次特化、六大決策、四種 bizModel 面板)
    renderRealestateTab(corp, contentArea, isReadOnly) {
        if (corp.residentialProjects === undefined) {
            this.initAssets(corp);
        }

        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        // 12種生產線二次特化定義
        const specialties = {
            'none': { name: '尚未配置二次特化生產線', desc: '開工建置特化可享有專屬特權與獲利倍數加成' },
            'classic_res': { name: '🏢 傳統高檔住宅預售線', desc: '住宅專案總銷售額額外加成 +15% / 利率抗性增加' },
            'giant_township': { name: '🏞️ 重劃區千戶造鎮大案', desc: '預售率初始成數永久加成 +20% / 利息支出降低' },
            'luxury_mansion': { name: '💎 指標型頂級豪宅極奢線', desc: '美學指標 luxuryValue 轉換率翻倍 / 高額豪宅租金溢價' },
            'scenic_mansion': { name: '🌊 高雄美術館第一排景觀線', desc: '南部買氣加持 / 都更案招標機率額外 +30%' },
            'resort_villa': { name: '🏖️ 涵碧美學渡假別墅莊園', desc: '富豪買單率提升 50% / 大眾聲譽大增' },
            'smart_office': { name: '🧠 智慧科學園區高規科技廠辦', desc: '半導體大廠擴廠連動訂單 / REITs 市值溢價 +25%' },
            'premium_office': { name: '🏢 A級綠建築地標商辦線', desc: 'REITs 發行租金日收益永久鎖定額外 +30%' },
            'shared_office': { name: '🚀 共享綠能低碳商務空間', desc: '招租率 occupancy 鎖定高於 90% 以上' },
            'complex_transit': { name: '🚇 高難度捷運共構共用線', desc: '營建代工毛利率翻倍 / 工安意外機率清零' },
            'tod_retail': { name: '🛍️ Global Mall 特許商場 TOD 線', desc: '防禦大增 / 熊市收租毛利率提升至 95%' },
            'bot_stadium': { name: '🏟️ 大型巨蛋體育館特許 BOT 線', desc: '捷運共構流量引流 / 綜合大眾聲譽大暴漲' }
        };

        const spec = specialties[corp.realestateSpecialty || 'none'];

        // 二次特化選單 HTML
        let specOptions = '';
        Object.entries(specialties).forEach(([key, sDef]) => {
            if (key === 'none') return;
            const selected = (corp.realestateSpecialty === key) ? 'selected' : '';
            specOptions += `<option value="${key}" ${selected}>${sDef.name} (${sDef.desc})</option>`;
        });

        // 營建三大成長指標進度條 (Progress bars)
        const brandBar = Math.min(100, Math.max(0, corp.brandReputation || 10));
        const techBar = Math.min(100, Math.max(0, (corp.techStandard || 1.0) * 10));
        const luxuryBar = Math.min(100, Math.max(0, corp.luxuryValue || 10));

        let html = `
        <div class="space-y-6">
            <!-- 營建不動產三大指標進度條面板 -->
            <div class="bg-black border border-cyan-900 p-4 shadow-[0_0_15px_rgba(0,255,255,0.05)]">
                <h3 class="text-white font-bold mb-3 border-b border-cyan-900 pb-2 flex justify-between items-center text-sm">
                    <span>🏗️ 營建板塊核心運營三大指標面板</span>
                    <span class="text-xs text-cyan">指標解鎖影響推案、招商與工安</span>
                </h3>
                <div class="space-y-3">
                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-cyan font-bold">📢 品牌大眾聲譽值 (brandReputation):</span>
                            <span class="text-cyan font-mono font-bold">${brandBar.toFixed(0)} / 100 點</span>
                        </div>
                        <div class="w-full bg-gray-900 h-2 border border-cyan-900">
                            <div class="bg-cyan-500 h-full shadow-[0_0_8px_#06b6d4]" style="width: ${brandBar}%"></div>
                        </div>
                        <div class="text-[10px] text-gray-500 mt-0.5">※ 決定住宅預售銷售成數、商場招商成功率與大眾買氣。</div>
                    </div>
                    
                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-green-400 font-bold">🔬 工程安全技術標準 (techStandard):</span>
                            <span class="text-green-400 font-mono font-bold">${(corp.techStandard || 1.0).toFixed(1)} / 10.0 級</span>
                        </div>
                        <div class="w-full bg-gray-900 h-2 border border-green-900">
                            <div class="bg-green-500 h-full shadow-[0_0_8px_#22c55e]" style="width: ${techBar}%"></div>
                        </div>
                        <div class="text-[10px] text-gray-500 mt-0.5">※ 決定社會住宅等大型公共標案得標門檻，標準越高越免於停工重罰。</div>
                    </div>
                    
                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-yellow-400 font-bold">💎 地段地標美學價值 (luxuryValue):</span>
                            <span class="text-yellow-400 font-mono font-bold">${luxuryBar.toFixed(0)} / 100 點</span>
                        </div>
                        <div class="w-full bg-gray-900 h-2 border border-yellow-900">
                            <div class="bg-yellow-500 h-full shadow-[0_0_8px_#eab308]" style="width: ${luxuryBar}%"></div>
                        </div>
                        <div class="text-[10px] text-gray-500 mt-0.5">※ 指標型豪宅富豪買單率、商辦租金溢價及發行 REITs 估值上限。</div>
                    </div>
                </div>
            </div>

            <!-- 二次產品生產線特化配置 -->
            <div class="bg-black border border-yellow-600 p-4">
                <h3 class="text-yellow font-bold mb-2 text-xs flex justify-between">
                    <span>⚙️ 營建二次產品生產線特化與特權</span>
                    <span class="text-gray-400">變更特化規費: $2,000,000</span>
                </h3>
                <div class="bg-gray-900 p-3 border border-yellow-900 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <div class="text-yellow font-bold text-sm">${spec.name}</div>
                        <div class="text-[11px] text-gray-400 mt-1">${spec.desc}</div>
                    </div>
                    ${!isReadOnly ? `
                    <div class="flex gap-2">
                        <select id="spec-select" class="bg-black border border-yellow-600 text-yellow text-xs p-2 outline-none cursor-pointer">
                            ${specOptions}
                        </select>
                        <button onclick="CEO_REALESTATE.configureSpecialty('${corp.id}', document.getElementById('spec-select').value)" 
                                class="btn-retro px-3 py-1.5 text-xs border-yellow-600 text-yellow hover:bg-yellow-900 hover:text-white font-bold transition">
                            變更特化
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- 六大成長與決策台按鈕 -->
            <div class="bg-black border border-red-900 p-4">
                <h3 class="text-white font-bold mb-3 border-b border-red-900 pb-2 text-sm flex justify-between items-center">
                    <span>📢 品牌聲譽與工程技術決策台 (Progression Decisions)</span>
                    <span class="text-xs text-gray-400">現鈔扣減即時生效</span>
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <button onclick="CEO_REALESTATE.executeDecision('${corp.id}', 'ad')" ${disabledAttr} class="bg-gray-900 border border-gray-800 hover:border-cyan-500 p-2.5 text-left rounded ${disabledClass}">
                        <div class="text-cyan font-bold text-xs">📢 投放大眾地產廣告</div>
                        <div class="text-[10px] text-gray-400 mt-1">聲譽 +5</div>
                        <div class="text-yellow font-mono text-xs mt-1">費用: $2.5M</div>
                    </button>
                    <button onclick="CEO_REALESTATE.executeDecision('${corp.id}', 'expo')" ${disabledAttr} class="bg-gray-900 border border-gray-800 hover:border-cyan-500 p-2.5 text-left rounded ${disabledClass}">
                        <div class="text-cyan font-bold text-xs">🎪 都更說明與推案會</div>
                        <div class="text-[10px] text-gray-400 mt-1">聲譽 +18</div>
                        <div class="text-yellow font-mono text-xs mt-1">費用: $8.0M</div>
                    </button>
                    <button onclick="CEO_REALESTATE.executeDecision('${corp.id}', 'expert')" ${disabledAttr} class="bg-gray-900 border border-gray-800 hover:border-green-500 p-2.5 text-left rounded ${disabledClass}">
                        <div class="text-green-400 font-bold text-xs">🧪 聘任結構工程院士</div>
                        <div class="text-[10px] text-gray-400 mt-1">技術 +0.8 級</div>
                        <div class="text-yellow font-mono text-xs mt-1">費用: $10.0M</div>
                    </button>
                    <button onclick="CEO_REALESTATE.executeDecision('${corp.id}', 'bim')" ${disabledAttr} class="bg-gray-900 border border-gray-800 hover:border-green-500 p-2.5 text-left rounded ${disabledClass}">
                        <div class="text-green-400 font-bold text-xs">🔬 導入 3D BIM 智慧營建</div>
                        <div class="text-[10px] text-gray-400 mt-1">技術 +2.0 級</div>
                        <div class="text-yellow font-mono text-xs mt-1">費用: $18.0M</div>
                    </button>
                    <button onclick="CEO_REALESTATE.executeDecision('${corp.id}', 'architect')" ${disabledAttr} class="bg-gray-900 border border-gray-800 hover:border-yellow-500 p-2.5 text-left rounded ${disabledClass}">
                        <div class="text-yellow-400 font-bold text-xs">🏎️ 聯名地標建築大師</div>
                        <div class="text-[10px] text-gray-400 mt-1">美學 +25 / 聲譽 +10</div>
                        <div class="text-yellow font-mono text-xs mt-1">費用: $25.0M</div>
                    </button>
                    <button onclick="CEO_REALESTATE.executeDecision('${corp.id}', 'wine')" ${disabledAttr} class="bg-gray-900 border border-gray-800 hover:border-yellow-500 p-2.5 text-left rounded ${disabledClass}">
                        <div class="text-yellow-400 font-bold text-xs">🥂 私人頂豪莊園品酒會</div>
                        <div class="text-[10px] text-gray-400 mt-1">美學 +8</div>
                        <div class="text-yellow font-mono text-xs mt-1">費用: $5.0M</div>
                    </button>
                </div>
            </div>

            <!-- 四大業務模型專屬操作分頁 -->
            <div class="bg-black border border-cyan-900 p-4">
                <h3 class="text-cyan font-bold mb-3 border-b border-cyan-900 pb-2 text-sm flex justify-between items-center">
                    <span>🏢 ${corp.bizModel === 'residential_dev' ? '🏠 住宅預售建商核心操作面版' : (corp.bizModel === 'commercial_dev' ? '🏢 商廠辦開發核心操作面版' : (corp.bizModel === 'contractor' ? '🏗️ 營造工程代工核心操作面版' : '🚇 捷運共構與 BOT 特許開發面板'))}</span>
                    <span class="bg-cyan-900 text-cyan text-xs font-mono font-bold px-1.5 py-0.5">${corp.bizModel.toUpperCase()}</span>
                </h3>
        `;

        // 1. 住宅開發面板
        if (corp.bizModel === 'residential_dev') {
            let resHtml = '';
            (corp.residentialProjects || []).forEach(p => {
                resHtml += `
                <div class="bg-gray-900 border border-gray-800 p-3 rounded text-xs flex justify-between items-center">
                    <div>
                        <div class="text-white font-bold text-sm">${p.name}</div>
                        <div class="text-gray-400 mt-1">預售簽約率: <span class="text-green-400 font-bold">${(p.preSaleRate*100).toFixed(1)}%</span> | 總銷預估: $${app.formatMoney(p.targetRevenue)}</div>
                        <div class="text-yellow mt-0.5">工期進度: 剩餘 <span class="font-bold">${p.daysLeft}</span> 天完工交屋</div>
                    </div>
                    <span class="text-cyan font-mono animate-pulse">興建預售中...</span>
                </div>`;
            });

            if (!resHtml) {
                resHtml = `<div class="text-gray-600 text-xs text-center py-6">目前無任何進行中的住宅預售開發案。</div>`;
            }

            html += `
                <div class="space-y-4">
                    <div class="flex gap-2">
                        <button onclick="CEO_REALESTATE.buyLand('${corp.id}')" ${disabledAttr} class="btn-retro px-4 py-2 border-yellow-600 text-yellow hover:bg-yellow-900 hover:text-white transition font-bold text-xs flex-1 ${disabledClass}">
                            🗺️ 重劃區向銀行土建融獵地 (自備款: $10,000,000) (目前土地庫存: ${corp.landCount || 0})
                        </button>
                        <button onclick="CEO_REALESTATE.launchResidentialProject('${corp.id}')" ${disabledAttr} class="btn-retro px-4 py-2 border-green-500 text-green-400 hover:bg-green-900 hover:text-white transition font-bold text-xs flex-1 ${disabledClass}">
                            🏠 啟動預售建案吸金專案 (開工準備金: $5,000,000)
                        </button>
                    </div>
                    
                    <h4 class="text-white font-bold text-xs mt-2 flex justify-between">
                        <span>📋 指標在建住宅與預售專案清單</span>
                        <span class="text-gray-400">共 ${corp.residentialProjects ? corp.residentialProjects.length : 0} 個項目</span>
                    </h4>
                    <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
                        ${resHtml}
                    </div>
                </div>
            `;
        }

        // 2. 商辦廠辦與 REITs 面板
        if (corp.bizModel === 'commercial_dev') {
            let comHtml = '';
            (corp.commercialRentals || []).forEach(p => {
                comHtml += `
                <div class="bg-gray-900 border border-gray-800 p-3 rounded text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div>
                        <div class="text-white font-bold text-sm">${p.name}</div>
                        <div class="text-gray-400 mt-1">預估招租率: <span class="text-green-400 font-bold">${(p.occupancy*100).toFixed(0)}%</span> | 每日租金基準: $${app.formatMoney(p.rentDaily)}</div>
                        <div class="text-[10px] text-gray-500">專案狀態: ${p.isREITs ? '<span class="text-magenta font-bold">REITs 證券化發行中 (高毛利穩定租金)</span>' : '<span class="text-yellow font-bold">自持商辦</span>'}</div>
                    </div>
                    ${!p.isREITs && !isReadOnly ? `
                    <div class="flex gap-1.5 mt-2 md:mt-0">
                        <button onclick="CEO_REALESTATE.sellCommercialWhole('${corp.id}', '${p.id}')" class="px-2 py-1 bg-yellow-950 text-yellow border border-yellow-600 rounded text-[10px] hover:bg-yellow-800 hover:text-white">整棟打包出售 ($60M+)</button>
                        <button onclick="CEO_REALESTATE.convertCommercialToREITs('${corp.id}', '${p.id}')" class="px-2 py-1 bg-purple-950 text-purple-300 border border-purple-600 rounded text-[10px] hover:bg-purple-800 hover:text-white">成立 REITs 證券化</button>
                    </div>
                    ` : ''}
                </div>`;
            });

            if (!comHtml) {
                comHtml = `<div class="text-gray-600 text-xs text-center py-6">目前無任何商辦廠辦大樓資產。</div>`;
            }

            html += `
                <div class="space-y-4">
                    <div class="flex gap-2">
                        <button onclick="CEO_REALESTATE.buildCommercialOffice('${corp.id}')" ${disabledAttr} class="btn-retro px-4 py-2 border-cyan-500 text-cyan hover:bg-cyan-900 hover:text-white transition font-bold text-xs flex-1 ${disabledClass}">
                            🏢 興建頂級商業大樓項目 (建置費: $25,000,000)
                        </button>
                    </div>
                    
                    <h4 class="text-white font-bold text-xs mt-2 flex justify-between">
                        <span>📋 指標商廠辦與 REITs 證券化清單</span>
                        <span class="text-gray-400">共 ${corp.commercialRentals ? corp.commercialRentals.length : 0} 個項目</span>
                    </h4>
                    <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
                        ${comHtml}
                    </div>
                </div>
            `;
        }

        // 3. 營造工程代工面板
        if (corp.bizModel === 'contractor') {
            let contractHtml = '';
            (corp.activeContracts || []).forEach(p => {
                contractHtml += `
                <div class="bg-gray-900 border border-gray-800 p-3 rounded text-xs flex justify-between items-center">
                    <div>
                        <div class="text-white font-bold text-sm">${p.name}</div>
                        <div class="text-gray-400 mt-1">標案總價: <span class="text-green-400 font-bold">$${app.formatMoney(p.value)}</span> | 當前進度: ${p.progress.toFixed(1)}%</div>
                    </div>
                    <div class="text-cyan font-mono animate-pulse">施工營造中...</div>
                </div>`;
            });

            if (!contractHtml) {
                contractHtml = `<div class="text-gray-600 text-xs text-center py-6">目前尚未承攬任何社會住宅或都更營造標案。</div>`;
            }

            const isHedged = corp.hedgeCementAndSteel;
            const isInflation = (typeof app.state.energyTrend !== 'undefined' && app.state.energyTrend > 1.2);

            html += `
                <div class="space-y-4">
                    <div class="bg-gray-900 p-3 border border-red-900 rounded text-xs flex justify-between items-center">
                        <div>
                            <div class="text-white font-bold">鋼筋水泥大宗原物料避險機制</div>
                            <div class="text-[10px] text-gray-400 mt-1">目前市場原物料趨勢: <span class="${isInflation ? 'text-red-500 font-bold animate-pulse' : 'text-green-400'}">${isInflation ? '📈 原物料暴漲 (通膨侵蝕毛利中)' : '🟢 原物料平穩'}</span></div>
                        </div>
                        <button onclick="CEO_REALESTATE.toggleHedge('${corp.id}')" ${disabledAttr} class="px-3 py-1.5 text-xs rounded border font-bold ${isHedged ? 'bg-green-950 text-green-400 border-green-500' : 'bg-red-950 text-red-400 border-red-500'} ${disabledClass}">
                            ${isHedged ? '🟢 原物料避險中 (已鎖定價格)' : '🔴 無避險 (面臨原物料上漲風險)'}
                        </button>
                    </div>

                    <div class="flex gap-2">
                        <button onclick="CEO_REALESTATE.bidSocialHousingContract('${corp.id}')" ${disabledAttr} class="btn-retro px-4 py-2 border-cyan-500 text-cyan hover:bg-cyan-900 hover:text-white transition font-bold text-xs flex-1 ${disabledClass}">
                            🏗️ 投標國家社會住宅與都更代工案 (要求安全標準: ${(3.0 + (corp.activeContracts ? corp.activeContracts.length * 1.5 : 0)).toFixed(1)} 級)
                        </button>
                    </div>
                    
                    <h4 class="text-white font-bold text-xs mt-2 flex justify-between">
                        <span>📋 當前工程營造承攬合約</span>
                        <span class="text-gray-400">共 ${corp.activeContracts ? corp.activeContracts.length : 0} 個工程案</span>
                    </h4>
                    <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
                        ${contractHtml}
                    </div>
                </div>
            `;
        }

        // 4. TOD 捷運共構與 BOT 面板
        if (corp.bizModel === 'asset_tod') {
            let todHtml = '';
            (corp.todCenters || []).forEach(p => {
                todHtml += `
                <div class="bg-gray-900 border border-gray-800 p-3 rounded text-xs flex justify-between items-center">
                    <div>
                        <div class="text-white font-bold text-sm">${p.name}</div>
                        <div class="text-gray-400 mt-1">每日穩定租金收入: <span class="text-green-400 font-bold">+$${app.formatMoney(p.dailyRent)}</span></div>
                        <div class="text-[10px] text-gray-500">招商合作商場知名度: <span class="text-yellow-400">${p.customerRep.toFixed(0)} 點</span></div>
                    </div>
                    <span class="text-magenta font-mono animate-pulse">TOD 長線穩定收租中...</span>
                </div>`;
            });

            if (!todHtml) {
                todHtml = `<div class="text-gray-600 text-xs text-center py-6">目前尚未取得任何捷運共構 BOT 特許經營項目。</div>`;
            }

            html += `
                <div class="space-y-4">
                    <div class="flex gap-2">
                        <button onclick="CEO_REALESTATE.bidTransitBOT('${corp.id}')" ${disabledAttr} class="btn-retro px-4 py-2 border-magenta-500 text-purple-400 hover:bg-purple-900 hover:text-white transition font-bold text-xs flex-1 ${disabledClass}">
                            🚇 競投政府捷運共構 BOT 與特許開發合約 (履約準備金: $15,000,000)
                        </button>
                    </div>
                    
                    <h4 class="text-white font-bold text-xs mt-2 flex justify-between">
                        <span>📋 特許捷運共構商場 (TOD & BOT) 物業</span>
                        <span class="text-gray-400">共 ${corp.todCenters ? corp.todCenters.length : 0} 個項目</span>
                    </h4>
                    <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
                        ${todHtml}
                    </div>
                </div>
            `;
        }

        html += `
            </div>
        </div>`;

        contentArea.innerHTML = html;
    }
};

// 掛載至 window 全域環境以供對接呼叫
if (typeof window !== 'undefined') {
    window.CEO_REALESTATE = CEO_REALESTATE;
}
