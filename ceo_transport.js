// ceo_transport.js - 航運與物流產業 (Transport Sector) 核心營運與結算系統
// 支援海運貨櫃、航空客運、基礎物流、大眾運輸四大子商業模型 (極致奢華 UI 玻璃化儀表板版)

const CEO_TRANSPORT = {
    // 1-B. 初始化上市公司與玩家自創資產
    initAssets(corp) {
        if (!corp.bizModel) return;
        
        // 確保玩家創立的公司是從零開始 (白手起家，無初始飛機/船隻/載具與長約)
        if (corp.isPlayerFounded) {
            if (corp.bizModel === 'marine') {
                corp.marineFleet = [];
                corp.marineContracts = [];
                corp.marineBiddingPool = [];
            } else if (corp.bizModel === 'airline') {
                corp.airlineFleet = [];
                corp.fuelHedges = [];
                corp.unlockedRoutes = ['short1'];
                corp.aviationReputation = 100;
            } else if (corp.bizModel === 'public_transit' || corp.bizModel === 'transit') {
                corp.transitFleet = [];
                corp.transitTicketPrice = 50;
            } else if (corp.bizModel === 'logistics') {
                corp.logisticsFleet = [];
                corp.logisticsHubs = 0;
            }
            return;
        }

        const scale = Math.floor((corp.price * corp.totalShares) / 100000000) || 1; 

        if (corp.sector === 'transport') {
            if (corp.bizModel === 'marine') {
                corp.marineFleet = [];
                let count = Math.min(10, Math.max(2, Math.floor(scale / 2)));
                for(let i=0; i<count; i++) {
                    corp.marineFleet.push({ id: `S-${Date.now()}-${i}`, type: 'feeder', teu: 2000, dailyFuel: 15, dailyMaint: 10000, status: 'idle', contractDays: 0 });
                }
                corp.marineContracts = [];
                let cCount = Math.min(5, Math.max(1, Math.floor(scale / 3)));
                for(let i=0; i<cCount; i++) {
                    corp.marineContracts.push({ id: `C-${Date.now()}-${i}`, client: '長榮海運', cargo: '電子產品', teu: 500, duration: 60, daysLeft: 60, dailyRate: 5000 });
                }
            } else if (corp.bizModel === 'airline') {
                corp.airlineFleet = [];
                corp.aviationReputation = 100 + scale * 10;
                let count = Math.min(8, Math.max(2, Math.floor(scale / 3)));
                for(let i=0; i<count; i++) {
                    corp.airlineFleet.push({ 
                        id: `P-${Date.now()}-${i}`, 
                        type: 'narrow', 
                        seats: 180, 
                        dailyFuel: 40, 
                        dailyMaint: 15000, 
                        assignedRoute: i%2===0?'short1':'reg1',
                        cabinConfig: { first: 0, business: Math.floor(180*0.1), economy: 180 - Math.floor(180*0.1) } 
                    });
                }
            } else if (corp.bizModel === 'public_transit' || corp.bizModel === 'transit') {
                corp.transitFleet = [];
                let count = Math.min(20, Math.max(5, scale));
                
                // 上市公司初始化客製化載具
                let cap = 40; let fuel = 50; let maint = 1000; let type = 'bus';
                if (corp.id === '2633') { cap = 1000; fuel = 500; maint = 50000; type = 'hsr'; }
                else if (corp.id === '2640') { cap = 4; fuel = 10; maint = 1000; type = 'taxi'; }
                else if (corp.id === 'CSX') { cap = 2000; fuel = 300; maint = 40000; type = 'train'; }
                else if (corp.id === 'UNP') { cap = 2500; fuel = 350; maint = 45000; type = 'train'; }
                
                for(let i=0; i<count; i++) {
                    corp.transitFleet.push({ id: `V-${Date.now()}-${i}`, type: type, capacity: cap, dailyFuel: fuel, dailyMaint: maint });
                }
                corp.transitTicketPrice = corp.id === '2633' ? 1490 : (corp.id === '2640' ? 150 : 50);
            } else if (corp.bizModel === 'logistics') {
                corp.logisticsFleet = [];
                let count = Math.min(15, Math.max(3, scale));
                for(let i=0; i<count; i++) {
                    corp.logisticsFleet.push({ id: `L-${Date.now()}-${i}`, type: 'heavy', capacity: 20, dailyFuel: 45, dailyMaint: 1000 });
                }
                corp.logisticsHubs = 0;
            }
        }
    },

    // 1-C. 每日高精度日結算邏輯
    processRevenue(corp) {
        if (!corp.bizModel) return;
        
        let dailyRev = 0;
        let dailyExp = 0;
        let fuelExpense = 0;
        let maintExpense = 0;
        let jetFuelPrice = app.state.jetFuelPrice || 85;
        let scfi = app.state.SCFI || 1500;
        
        // A. 海運貨櫃模式
        if (corp.bizModel === 'marine' && corp.marineFleet) {
            let fuelCostPerUnit = jetFuelPrice * 10;
            
            // 隨機產生招標會合約
            if (!corp.marineBiddingPool) corp.marineBiddingPool = [];
            if (corp.marineBiddingPool.length < 3 && Math.random() < 0.2) {
                let duration = Math.floor(Math.random() * 60) + 30;
                let reqTeu = Math.floor(Math.random() * 10000) + 2000;
                let cRate = reqTeu * scfi * 0.45; // 稍微低於現貨以求鎖定價格
                corp.marineBiddingPool.push({
                    id: `C-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                    client: ['長榮', '陽明', '萬海', '馬士基', '地中海航運', '赫伯羅特', '中遠海運'][Math.floor(Math.random() * 7)],
                    cargo: ['電子產品', '原物料', '汽車零件', '紡織品', '化工原料'][Math.floor(Math.random() * 5)],
                    teu: reqTeu,
                    duration: duration,
                    dailyRate: cRate
                });
            }

            if (corp.marineContracts) {
                for (let i = corp.marineContracts.length - 1; i >= 0; i--) {
                    let c = corp.marineContracts[i];
                    dailyRev += c.dailyRate;
                    c.daysLeft--;
                    if (c.daysLeft <= 0) {
                        corp.marineContracts.splice(i, 1);
                        app.log(`【海運通知】${corp.name} 的一份貨櫃合約已到期，不再產生營收。`, "text-yellow");
                    }
                }
            }
            
            corp.marineFleet.forEach(s => {
                maintExpense += s.dailyMaint;
                fuelExpense += (s.dailyFuel * fuelCostPerUnit);
                if (s.status === 'contract') {
                    s.contractDays--;
                    if (s.contractDays <= 0) {
                        s.status = 'idle';
                        s.assignedContractId = null;
                    }
                } else if (s.status === 'idle') {
                    // 現貨市場營收
                    dailyRev += (s.teu * scfi * 0.5);
                }
            });
            dailyExp += maintExpense + fuelExpense;
        } 
        // B. 航空客運模式
        else if (corp.bizModel === 'airline' && corp.airlineFleet) {
            const routes = [
                { id: 'short1', name: '台北 - 沖繩', type: '短程', reqRep: 0, profitBase: 800 },
                { id: 'short2', name: '台北 - 香港', type: '短程', reqRep: 120, profitBase: 900 },
                { id: 'short3', name: '台北 - 澳門', type: '短程', reqRep: 150, profitBase: 850 },
                { id: 'reg1', name: '台北 - 東京', type: '中程', reqRep: 200, profitBase: 1800 },
                { id: 'reg2', name: '台北 - 北京', type: '中程', reqRep: 250, profitBase: 1700 },
                { id: 'reg3', name: '台北 - 帛琉', type: '中程', reqRep: 280, profitBase: 1600 },
                { id: 'reg4', name: '台北 - 新加坡', type: '中程', reqRep: 300, profitBase: 1900 },
                { id: 'long1', name: '台北 - 洛杉磯', type: '長程', reqRep: 400, profitBase: 4500 },
                { id: 'long2', name: '台北 - 紐約', type: '長程', reqRep: 450, profitBase: 4800 },
                { id: 'long3', name: '台北 - 倫敦', type: '長程', reqRep: 480, profitBase: 4600 }
            ];

            let effectiveJetFuelPrice = jetFuelPrice;
            if (corp.fuelHedges && corp.fuelHedges.length > 0) {
                for (let i = corp.fuelHedges.length - 1; i >= 0; i--) {
                    let h = corp.fuelHedges[i];
                    h.daysLeft--;
                    if (h.daysLeft <= 0) {
                        corp.fuelHedges.splice(i, 1);
                        app.log(`【避險到期】${corp.name} 的燃油期貨合約已到期結算。`, "text-yellow");
                    }
                }
                // 使用所有有效避險合約的平均鎖定油價
                if (corp.fuelHedges.length > 0) {
                    effectiveJetFuelPrice = corp.fuelHedges.reduce((sum, h) => sum + h.lockedPrice, 0) / corp.fuelHedges.length;
                }
            }

            // 黑天鵝事件 (影響載客率)
            let externalOccupancyMod = 0;
            if (Math.random() < 0.005) { // 0.5% 機率發生病毒事件
                app.log(`【全球快訊】新型病毒爆發，航空業載客率瞬間歸零，面臨破產危機！`, "text-red-500 font-bold animate-pulse");
                externalOccupancyMod = -0.6; // 減去 60% 載客率
            } else if (Math.random() < 0.005) { // 0.5% 機率發生報復旅遊
                app.log(`【全球快訊】報復性旅遊潮爆發，航空業迎來賺錢黃金期！`, "text-green-500 font-bold animate-pulse");
                externalOccupancyMod = 0.4; // 增加 40% 載客率
            }

            corp.airlineFleet.forEach(s => {
                maintExpense += s.dailyMaint;
                if (s.assignedRoute) {
                    let routeDef = routes.find(r => r.id === s.assignedRoute);
                    if (routeDef) {
                        fuelExpense += (s.dailyFuel * effectiveJetFuelPrice * 0.05);
                        let baseOccupancy = 0.6 + Math.random() * 0.3 + externalOccupancyMod;
                        let occupancy = Math.max(0.0, Math.min(1.0, baseOccupancy));
                        
                        // 確保改艙設定存在
                        if (!s.cabinConfig) {
                            s.cabinConfig = { first: 0, business: Math.floor(s.seats*0.1), economy: s.seats - Math.floor(s.seats*0.1) };
                        }
                        
                        let ecoRev = s.cabinConfig.economy * occupancy * routeDef.profitBase;
                        let bizRev = s.cabinConfig.business * occupancy * routeDef.profitBase * 3; // 商務艙利潤高 3 倍
                        
                        dailyRev += (ecoRev + bizRev);
                        corp.aviationReputation = Math.min(1000, (corp.aviationReputation || 0) + 0.5);
                    }
                }
            });
            dailyExp += maintExpense + fuelExpense;
            corp.aviationReputation = Math.min(1000, (corp.aviationReputation || 0) + 0.1);
        }
        // C. 大眾運輸模式
        else if ((corp.bizModel === 'public_transit' || corp.bizModel === 'transit') && corp.transitFleet) {
            let price = corp.transitTicketPrice || 50;
            // 票價彈性：價格過高載客率下降
            let optimalPrice = corp.id === '2633' ? 1500 : (corp.id === '2640' ? 200 : 50);
            if (corp.id === 'CSX' || corp.id === 'UNP') optimalPrice = 800; // 重載鐵路之票價甜蜜點
            
            let occupancy = Math.max(0.05, Math.min(1.0, 1.0 - ((price - optimalPrice) / (optimalPrice * 1.5))));
            
            corp.transitFleet.forEach(s => {
                maintExpense += s.dailyMaint;
                fuelExpense += (s.dailyFuel * jetFuelPrice * 0.1);
                dailyRev += (s.capacity * occupancy * price * 10);
            });
            dailyExp += maintExpense + fuelExpense;
        }
        // D. 基礎物流模式
        else if (corp.bizModel === 'logistics' && corp.logisticsFleet) {
            let demand = app.state.logisticsDemand || 100;
            let occupancy = Math.max(0.1, Math.min(1.0, demand / 200));
            
            let evSavings = 0;
            corp.logisticsFleet.forEach(s => {
                maintExpense += s.dailyMaint;
                if (!s.isEV) {
                    fuelExpense += (s.dailyFuel * jetFuelPrice * 0.05);
                } else {
                    evSavings += 500;
                }
                
                // 若有簽訂大聯盟長約，確保基本盤運量不受景氣循環影響
                let finalOccupancy = occupancy;
                if (corp.hasRetailAlliance || corp.hasSoftwareAlliance) {
                    finalOccupancy = Math.max(0.8, occupancy); // 保底 80% 滿載
                }
                dailyRev += (s.capacity * finalOccupancy * 300);
            });
            
            // AI 自動化理貨中心減少 OPEX
            if (corp.logisticsHubs > 0) {
                let reduction = 1.0 - Math.min(0.5, corp.logisticsHubs * 0.1); // 最多減少 50%
                maintExpense *= reduction;
            }
            dailyExp += maintExpense + fuelExpense;
        }
        
        // 統一更新上市公司財務數據
        corp.corporateCash = (corp.corporateCash || 0) + dailyRev - dailyExp;
        if (corp.corporateCash < 0) corp.corporateCash = 0;
        
        corp.monthRevenue = (corp.monthRevenue || 0) + dailyRev;
        corp.monthExpense = (corp.monthExpense || 0) + dailyExp;
        
        corp.monthFuelExpense = (corp.monthFuelExpense || 0) + fuelExpense;
        corp.monthMaintExpense = (corp.monthMaintExpense || 0) + maintExpense;
        
        corp.lastDailyRev = dailyRev;
        corp.lastDailyExp = dailyExp;
    },

    // 1-D. 營運 Tab 渲染路由
    renderTransportTab(corp, contentArea, isReadOnly) {
        if (corp.bizModel === 'marine') {
            this.renderMarineTab(corp, contentArea, isReadOnly);
        } else if (corp.bizModel === 'airline') {
            this.renderAirlineTab(corp, contentArea, isReadOnly);
        } else if (corp.bizModel === 'logistics') {
            this.renderLogisticsTab(corp, contentArea, isReadOnly);
        } else if (corp.bizModel === 'public_transit' || corp.bizModel === 'transit') {
            this.renderTransitTab(corp, contentArea, isReadOnly);
        } else {
            contentArea.innerHTML = `<div class="p-4 text-gray-500">[${corp.bizModel}] 未知營運模式</div>`;
        }
    },

    // A. 渲染海運貨櫃面板 (湛藍發光毛玻璃儀表板)
    renderMarineTab(corp, contentArea, isReadOnly) {
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';
        let scfi = app.state.SCFI ? Math.floor(app.state.SCFI) : 1500;
        let scfiColor = scfi > 2000 ? 'text-red-400 font-bold' : 'text-green-400 font-bold';
        
        let html = `<div class="p-5 bg-gradient-to-br from-gray-950 via-slate-900 to-black border border-slate-800 rounded-lg shadow-[0_0_20px_rgba(0,128,255,0.08)]">
            <div class="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                <h3 class="text-blue-400 font-bold text-xl tracking-wider flex items-center gap-2">🚢 海運貨櫃 (Marine Operations)</h3>
                <span class="text-xs bg-blue-900 bg-opacity-40 text-blue-300 border border-blue-800 border-opacity-50 px-2 py-0.5 rounded font-mono">DASHBOARD</span>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-5">
                <div class="bg-slate-900 bg-opacity-50 p-4 rounded-md border border-slate-800 shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]">
                    <div class="text-xs text-slate-400 tracking-wider">全球貨櫃運價指數 (SCFI)</div>
                    <div class="text-3xl font-extrabold ${scfiColor} font-mono mt-1">${scfi.toLocaleString()}</div>
                    <div class="text-[10px] text-slate-500 mt-1">影響現貨 TEU 收益及招標費率</div>
                </div>
                <div class="bg-slate-900 bg-opacity-50 p-4 rounded-md border border-slate-800 shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]">
                    <div class="text-xs text-slate-400 tracking-wider">旗下閒置運力 (TEU)</div>
                    <div class="text-3xl font-extrabold text-yellow font-mono mt-1">${corp.marineFleet.filter(s=>s.status==='idle').reduce((a,b)=>a+b.teu, 0).toLocaleString()}</div>
                    <div class="text-[10px] text-slate-500 mt-1">現貨運力將以 SCFI 的 50% 每日跑單</div>
                </div>
            </div>`;
            
        // 船隊總覽
        html += `<h4 class="text-sm text-slate-300 font-bold mb-2 flex items-center gap-1.5">⚓ 旗下船隊輪廓 (Fleet Profile)</h4>
        <div class="overflow-x-auto mb-4 border border-slate-800 rounded">
            <table class="w-full text-xs text-left text-slate-300 border-collapse">
                <thead class="text-[10px] text-slate-400 uppercase bg-slate-900 bg-opacity-80 border-b border-slate-800">
                    <tr><th class="p-2">船隻 ID</th><th class="p-2">型號與級別</th><th class="p-2">裝載運力</th><th class="p-2">當前狀態</th></tr>
                </thead>
                <tbody>`;
        corp.marineFleet.forEach(s => {
            let tName = s.type === 'mega' ? 'Mega 級巨型船' : (s.type === 'panamax' ? 'Panamax 巴拿馬型' : 'Feeder 支線船');
            let statusBadge = s.status === 'idle' 
                ? `<span class="bg-green-950 text-green-400 border border-green-900 px-1.5 py-0.5 rounded text-[10px]">閒置跑現貨</span>` 
                : `<span class="bg-yellow-950 text-yellow-500 border border-yellow-900 px-1.5 py-0.5 rounded text-[10px]">合約執行中 (剩 ${s.contractDays} 天)</span>`;
            html += `<tr class="border-b border-slate-800 hover:bg-slate-900 hover:bg-opacity-40 transition">
                <td class="p-2 font-mono text-slate-400">${s.id}</td>
                <td class="p-2 font-bold">${tName}</td>
                <td class="p-2 font-mono text-blue-400">${s.teu.toLocaleString()} TEU</td>
                <td class="p-2">${statusBadge}</td>
            </tr>`;
        });
        if (corp.marineFleet.length === 0) {
            html += `<tr><td colspan="4" class="p-4 text-center text-slate-500 italic">目前無任何貨運船隻，請於下方增購。</td></tr>`;
        }
        html += `</tbody></table></div>`;
        
        // 購買船隻 (標示明確運力與微動效)
        html += `<div class="bg-slate-900 bg-opacity-40 p-3.5 border border-slate-800 rounded-md mb-5">
            <div class="text-xs text-slate-400 font-bold mb-2">💸 增購重型貨櫃輪 (Acquisition CapEx)</div>
            <div class="grid grid-cols-3 gap-2">
                <button class="bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white p-2 rounded text-xs transition duration-300 hover:scale-[1.02] active:scale-[0.98] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.buyMarineShip('${corp.id}', 'feeder')">
                    <div class="font-bold">支線輪 (Feeder)</div>
                    <div class="font-mono text-[10px] text-blue-300 mt-0.5">2,000 TEU | $30M</div>
                </button>
                <button class="bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white p-2 rounded text-xs transition duration-300 hover:scale-[1.02] active:scale-[0.98] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.buyMarineShip('${corp.id}', 'panamax')">
                    <div class="font-bold">巴拿馬 (Panamax)</div>
                    <div class="font-mono text-[10px] text-blue-300 mt-0.5">5,000 TEU | $80M</div>
                </button>
                <button class="bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white p-2 rounded text-xs transition duration-300 hover:scale-[1.02] active:scale-[0.98] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.buyMarineShip('${corp.id}', 'mega')">
                    <div class="font-bold">巨無霸 (Mega)</div>
                    <div class="font-mono text-[10px] text-blue-300 mt-0.5">15,000 TEU | $150M</div>
                </button>
            </div>
        </div>`;
 
        // 進行中的長約
        html += `<h4 class="text-sm text-slate-300 font-bold mb-2">📜 履行中合約 (Active Contracts)</h4>`;
        if (corp.marineContracts.length === 0) {
            html += `<div class="text-xs text-slate-500 mb-4 bg-slate-900 bg-opacity-40 p-3 rounded text-center border border-slate-800 italic">目前無執行中合約，運力完全在現貨市場流動。</div>`;
        } else {
            html += `<div class="space-y-1.5 mb-4 max-h-36 overflow-y-auto pr-1">`;
            corp.marineContracts.forEach(c => {
                let progress = ((c.duration - c.daysLeft) / c.duration) * 100;
                html += `<div class="text-xs bg-slate-900 bg-opacity-60 border border-slate-800 p-2.5 rounded flex flex-col gap-1.5 shadow-[0_2px_5px_rgba(0,0,0,0.1)]">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-slate-300">${c.client} (${c.teu.toLocaleString()} TEU)</span>
                        <span class="text-green-400 font-mono font-bold">+$${app.formatMoney(c.dailyRate)} / 天</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div class="bg-blue-500 h-full" style="width: ${progress}%"></div>
                        </div>
                        <span class="text-[10px] text-slate-500 font-mono">剩 ${c.daysLeft} 天</span>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }
 
        // 招標會 (可接合約)
        html += `<h4 class="text-sm text-slate-300 font-bold mb-2">🤝 國際招標會 (Available Bids)</h4>`;
        if (!corp.marineBiddingPool || corp.marineBiddingPool.length === 0) {
            html += `<div class="text-xs text-slate-500 mb-2 bg-slate-900 bg-opacity-40 p-3 rounded text-center border border-slate-800 italic">目前無開放投標的合約，請等待市場釋出。</div>`;
        } else {
            html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 max-h-48 overflow-y-auto pr-1">`;
            corp.marineBiddingPool.forEach((b, idx) => {
                html += `<div class="bg-slate-900 bg-opacity-60 border border-slate-800 p-3 rounded flex flex-col justify-between hover:border-slate-700 transition">
                    <div class="mb-2">
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-slate-300 text-xs">${b.client}</span>
                            <span class="text-yellow text-[10px] font-mono border border-yellow-900 border-opacity-40 px-1.5 py-0.5 rounded bg-yellow-950 bg-opacity-20">${b.duration} 天約</span>
                        </div>
                        <div class="text-[10px] text-slate-400 mt-1">貨物類型: <span class="text-white">${b.cargo}</span></div>
                        <div class="text-[10px] text-slate-400">運力需求: <span class="text-blue-300 font-mono">${b.teu.toLocaleString()} TEU</span></div>
                    </div>
                    <div class="flex items-center justify-between border-t border-slate-800 pt-2 mt-1">
                        <div class="text-[10px] text-slate-500 font-mono">預估日收: <span class="text-green-400 font-bold">$${app.formatMoney(b.dailyRate)}</span></div>
                        <button class="bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded text-[10px] font-bold transition ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.acceptMarineContract('${corp.id}', ${idx})">簽約承運</button>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }
        
        html += `</div>`;
        contentArea.innerHTML = html;
    },

    // B. 渲染航空客運面板 (極致紫夜發光毛玻璃儀表板)
    renderAirlineTab(corp, contentArea, isReadOnly) {
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';
        let jetPrice = app.state.jetFuelPrice ? Math.floor(app.state.jetFuelPrice) : 85;
        let jetColor = jetPrice > 100 ? 'text-red-400 font-bold' : 'text-green-400 font-bold';
        
        let html = `<div class="p-5 bg-gradient-to-br from-gray-950 via-slate-900 to-black border border-slate-800 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.08)]">
            <div class="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                <h3 class="text-purple-400 font-bold text-xl tracking-wider flex items-center gap-2">✈️ 航空客運 (Aviation Operations)</h3>
                <span class="text-xs bg-purple-900 bg-opacity-40 text-purple-300 border border-purple-800 border-opacity-50 px-2 py-0.5 rounded font-mono">DASHBOARD</span>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-5">
                <div class="bg-slate-900 bg-opacity-50 p-4 rounded-md border border-slate-800">
                    <div class="text-xs text-slate-400 tracking-wider">國際航空燃油價格 (Jet Fuel)</div>
                    <div class="text-3xl font-extrabold ${jetColor} font-mono mt-1">$${jetPrice.toFixed(1)} <span class="text-xs">/ 桶</span></div>
                    <div class="text-[10px] text-slate-500 mt-1">油價飆漲將嚴重擠壓航空利潤</div>
                </div>
                <div class="bg-slate-900 bg-opacity-50 p-4 rounded-md border border-slate-800">
                    <div class="text-xs text-slate-400 tracking-wider">全球航空聲譽 (Reputation)</div>
                    <div class="text-3xl font-extrabold text-yellow font-mono mt-1">${Math.floor(corp.aviationReputation || 0)} <span class="text-xs text-slate-500 font-normal">/ 1000</span></div>
                    <div class="text-[10px] text-slate-500 mt-1">聲譽增長可解鎖國際高毛利長程航線</div>
                </div>
            </div>`;
 
        // 燃油避險 (高質感期貨展示)
        html += `<h4 class="text-sm text-slate-300 font-bold mb-2">🛡️ 燃油期貨避險 (Hedge Options)</h4>
        <div class="bg-slate-900 bg-opacity-40 border border-slate-800 p-3.5 rounded-md mb-5">`;
        let activeHedges = (corp.fuelHedges || []).filter(h => h.daysLeft > 0);
        if (activeHedges.length > 0) {
            html += `<div class="grid grid-cols-2 gap-2 mb-3">`;
            activeHedges.forEach(h => {
                html += `<div class="bg-purple-950 bg-opacity-20 border border-purple-900 border-opacity-40 p-2 rounded text-xs flex flex-col shadow-[inset_0_0_5px_rgba(168,85,247,0.1)]">
                    <span class="text-purple-300 font-bold">鎖定價格: $${h.lockedPrice} / 桶</span>
                    <span class="text-slate-500 text-[10px] mt-0.5">合約剩餘: <span class="text-white font-mono">${h.daysLeft}</span> 天</span>
                </div>`;
            });
            html += `</div>`;
        } else {
            html += `<div class="text-xs text-slate-500 mb-3 italic text-center">目前油價完全隨現貨波動，無避險期貨鎖定。</div>`;
        }
        html += `<button class="bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-white font-bold px-3 py-2 rounded text-xs w-full transition hover:scale-[1.01] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.buyFuelHedge('${corp.id}')">
            🛡️ 買入 90 天燃油期貨鎖定 (-$20M | 當前鎖定價: $${jetPrice}/桶)
        </button>
        </div>`;
 
        // 航線權利金解鎖 (Glass Cells)
        html += `<h4 class="text-sm text-slate-300 font-bold mb-2">🗺️ 航線開通與行銷開發 (Aviation Routes)</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5 max-h-48 overflow-y-auto pr-1">`;
        
        const allRoutes = [
            { id: 'short1', name: '台北 - 沖繩 (短程)', reqRep: 0, cost: 0 },
            { id: 'short2', name: '台北 - 香港 (短程)', reqRep: 120, cost: 10000000 },
            { id: 'short3', name: '台北 - 澳門 (短程)', reqRep: 150, cost: 15000000 },
            { id: 'reg1', name: '台北 - 東京 (中程)', reqRep: 200, cost: 30000000 },
            { id: 'reg2', name: '台北 - 北京 (中程)', reqRep: 250, cost: 40000000 },
            { id: 'reg3', name: '台北 - 帛琉 (中程)', reqRep: 280, cost: 35000000 },
            { id: 'reg4', name: '台北 - 新加坡 (中程)', reqRep: 300, cost: 50000000 },
            { id: 'long1', name: '台北 - 洛杉磯 (長程)', reqRep: 400, cost: 120000000 },
            { id: 'long2', name: '台北 - 紐約 (長程)', reqRep: 450, cost: 150000000 },
            { id: 'long3', name: '台北 - 倫敦 (長程)', reqRep: 480, cost: 140000000 }
        ];
 
        if (!corp.unlockedRoutes) corp.unlockedRoutes = ['short1'];
 
        allRoutes.forEach(r => {
            let isUnlocked = corp.unlockedRoutes.includes(r.id);
            if (isUnlocked) {
                html += `<div class="bg-slate-900 bg-opacity-70 p-2.5 rounded border border-purple-950 flex justify-between items-center shadow-[0_2px_5px_rgba(0,0,0,0.1)]">
                    <span class="text-purple-300 text-xs font-bold flex items-center gap-1">✈️ ${r.name}</span>
                    <span class="text-[10px] bg-purple-950 text-purple-400 border border-purple-900 px-1.5 py-0.5 rounded font-bold">已開通航權</span>
                </div>`;
            } else {
                let repOk = corp.aviationReputation >= r.reqRep;
                html += `<div class="bg-slate-950 bg-opacity-40 p-2.5 rounded border border-slate-800 flex justify-between items-center hover:border-slate-700 transition">
                    <div class="flex flex-col">
                        <span class="text-slate-400 text-xs">${r.name}</span>
                        <span class="text-[10px] text-slate-500 mt-0.5">聲譽需 ${r.reqRep} (當前 ${Math.floor(corp.aviationReputation)})</span>
                    </div>
                    <button class="px-2.5 py-1 text-[10px] rounded font-bold transition text-white ${(!repOk || isReadOnly) ? 'bg-slate-800 opacity-50 cursor-not-allowed text-slate-500' : 'bg-purple-800 hover:bg-purple-700'}" ${(!repOk || isReadOnly) ? 'disabled' : ''} onclick="CEO_TRANSPORT.buyAirlineRoute('${corp.id}', '${r.id}', ${r.cost})">
                        解鎖 ($${app.formatMoney(r.cost)})
                    </button>
                </div>`;
            }
        });
        html += `</div>`;
 
        // 機隊管理
        html += `<h4 class="text-sm text-slate-300 font-bold mb-2">✈️ 機隊引進與調度管理 (Fleet Expansion)</h4>
        <div class="bg-slate-900 bg-opacity-40 p-3.5 border border-slate-800 rounded-md mb-5">
            <div class="text-xs text-slate-400 font-bold mb-2">🛒 引進先進噴射客機 (Aircraft Procurement)</div>
            <div class="grid grid-cols-3 gap-2">
                <button class="bg-gradient-to-r from-purple-950 to-indigo-950 hover:from-purple-900 hover:to-indigo-900 text-white p-2 rounded text-xs transition duration-300 hover:scale-[1.02] active:scale-[0.98] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.buyAirlinePlane('${corp.id}', 'narrow')">
                    <div class="font-bold">窄體機 (Narrow)</div>
                    <div class="font-mono text-[10px] text-purple-300 mt-0.5">180 席 | $60M</div>
                </button>
                <button class="bg-gradient-to-r from-purple-950 to-indigo-950 hover:from-purple-900 hover:to-indigo-900 text-white p-2 rounded text-xs transition duration-300 hover:scale-[1.02] active:scale-[0.98] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.buyAirlinePlane('${corp.id}', 'wide')">
                    <div class="font-bold">廣體機 (Wide-Body)</div>
                    <div class="font-mono text-[10px] text-purple-300 mt-0.5">350 席 | $150M</div>
                </button>
                <button class="bg-gradient-to-r from-purple-950 to-indigo-950 hover:from-purple-900 hover:to-indigo-900 text-white p-2 rounded text-xs transition duration-300 hover:scale-[1.02] active:scale-[0.98] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.buyAirlinePlane('${corp.id}', 'jumbo')">
                    <div class="font-bold">巨無霸 (Jumbo)</div>
                    <div class="font-mono text-[10px] text-purple-300 mt-0.5">550 席 | $300M</div>
                </button>
            </div>
        </div>`;
 
        // 飛機清單 (含改艙進度條與派發)
        html += `<div class="overflow-x-auto border border-slate-800 rounded">
            <table class="w-full text-xs text-left text-slate-300 border-collapse">
                <thead class="text-[10px] text-slate-400 uppercase bg-slate-900 bg-opacity-80 border-b border-slate-800">
                    <tr><th class="p-2">飛機 ID</th><th class="p-2">機型與座位配置</th><th class="p-2">指派航線</th><th class="p-2">操作動作</th></tr>
                </thead>
                <tbody>`;
        corp.airlineFleet.forEach((s, idx) => {
            let tName = s.type === 'jumbo' ? '巨無霸客機' : (s.type === 'wide' ? '廣體客機' : '窄體客機');
            let bizPct = (s.cabinConfig.business / s.seats) * 100;
            let ecoPct = (s.cabinConfig.economy / s.seats) * 100;
            
            let routeNameStr = s.assignedRoute ? allRoutes.find(x=>x.id===s.assignedRoute).name.split(String.fromCharCode(32, 40))[0] : '🚫 閒置停機';
            
            html += `<tr class="border-b border-slate-800 hover:bg-slate-900 hover:bg-opacity-40 transition">
                <td class="p-2 font-mono text-slate-400">${s.id}</td>
                <td class="p-2">
                    <div class="font-bold">${tName} (${s.seats}座)</div>
                    <div class="flex items-center gap-1.5 mt-1">
                        <div class="w-20 h-1.5 bg-slate-850 rounded-full overflow-hidden flex">
                            <div class="bg-yellow-500 h-full" style="width: ${bizPct}%" title="商務艙"></div>
                            <div class="bg-purple-500 h-full" style="width: ${ecoPct}%" title="經濟艙"></div>
                        </div>
                        <span class="text-[9px] text-slate-500">商務 ${s.cabinConfig.business} | 經濟 ${s.cabinConfig.economy}</span>
                    </div>
                </td>
                <td class="p-2 text-yellow font-bold text-xs">${routeNameStr}</td>
                <td class="p-2">
                    <div class="flex items-center gap-1">
                        <select class="bg-slate-900 border border-slate-800 text-[10px] rounded p-1 text-slate-300 font-bold focus:border-purple-800 ${disabledClass}" ${disabledAttr} id="route_select_${idx}">
                            <option value="">--停飛閒置--</option>
                            ${corp.unlockedRoutes.map(rid => {
                                let rName = allRoutes.find(x=>x.id===rid).name.split(String.fromCharCode(32, 40))[0];
                                let sel = s.assignedRoute === rid ? 'selected' : '';
                                return `<option value="${rid}" ${sel}>${rName}</option>`;
                            }).join('')}
                        </select>
                        <button class="bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded text-[10px] font-bold transition ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.assignAirlinePlane('${corp.id}', ${idx}, document.getElementById('route_select_${idx}').value)">派飛</button>
                        <button class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[10px] font-bold transition ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.openCabinModal('${corp.id}', ${idx})">改艙</button>
                    </div>
                </td>
            </tr>`;
        });
        if (corp.airlineFleet.length === 0) {
            html += `<tr><td colspan="4" class="p-4 text-center text-slate-500 italic">目前無任何執照飛機，請引進機隊。</td></tr>`;
        }
        html += `</tbody></table></div>`;
        
        html += `</div>`;
        contentArea.innerHTML = html;
    },

    // C. 渲染基礎物流面板 (賽博金橘重型鋼鐵儀表板)
    renderLogisticsTab(corp, contentArea, isReadOnly) {
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';
        let demand = app.state.logisticsDemand ? Math.floor(app.state.logisticsDemand) : 100;
        let demandColor = demand > 120 ? 'text-red-400 font-bold' : 'text-green-400 font-bold';
        
        let html = `<div class="p-5 bg-gradient-to-br from-gray-950 via-slate-900 to-black border border-slate-800 rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.08)]">
            <div class="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                <h3 class="text-orange-400 font-bold text-xl tracking-wider flex items-center gap-2">🚚 基礎物流 (Logistics Operations)</h3>
                <span class="text-xs bg-orange-900 bg-opacity-40 text-orange-300 border border-orange-800 border-opacity-50 px-2 py-0.5 rounded font-mono">DASHBOARD</span>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-5">
                <div class="bg-slate-900 bg-opacity-50 p-4 rounded-md border border-slate-800">
                    <div class="text-xs text-slate-400 tracking-wider">全球物流景氣指數 (Logistics Demand)</div>
                    <div class="text-3xl font-extrabold ${demandColor} font-mono mt-1">${demand} %</div>
                    <div class="text-[10px] text-slate-500 mt-1">大聯盟結約可享有 80% 載貨保底避險</div>
                </div>
                <div class="bg-slate-900 bg-opacity-50 p-4 rounded-md border border-slate-800">
                    <div class="text-xs text-slate-400 tracking-wider">旗下物流運輸大隊 (Fleet Size)</div>
                    <div class="text-3xl font-extrabold text-orange-300 font-mono mt-1">${corp.logisticsFleet.length} <span class="text-xs text-slate-500 font-normal">輛</span></div>
                    <div class="text-[10px] text-slate-500 mt-1">EV 電動車比例: ${corp.logisticsFleet.filter(x=>x.isEV).length} 輛 (免油能成本)</div>
                </div>
            </div>`;
 
        // 基礎設施與車隊
        html += `<h4 class="text-sm text-slate-300 font-bold mb-2">🏭 設施擴張與新能源車隊轉型</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <div class="bg-slate-900 bg-opacity-50 border border-slate-800 p-4 rounded-md flex flex-col justify-between shadow-[inset_0_0_10px_rgba(255,255,255,0.01)]">
                <div>
                    <div class="font-bold text-slate-200 text-sm flex justify-between">
                        <span>AI 自動化理貨中心</span>
                        <span class="text-orange-400 font-mono">${corp.logisticsHubs} 座</span>
                    </div>
                    <div class="text-[10px] text-slate-500 mt-1 mb-3">每建設一座永久降低旗下所有車隊 10% 營運維護支出 (最多 50%)。</div>
                </div>
                <button class="bg-gradient-to-r from-orange-950 to-slate-900 hover:from-orange-900 hover:to-slate-800 text-orange-300 border border-orange-900 font-bold py-2 rounded text-xs transition duration-300 hover:scale-[1.01] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.buildLogisticsHub('${corp.id}')">
                    建設 AI 自動化中心 (-$50M)
                </button>
            </div>
            <div class="bg-slate-900 bg-opacity-50 border border-slate-800 p-4 rounded-md flex flex-col justify-between shadow-[inset_0_0_10px_rgba(255,255,255,0.01)]">
                <div>
                    <div class="font-bold text-slate-200 text-sm">買入先進物流貨車</div>
                    <div class="text-[10px] text-slate-500 mt-1 mb-3">引進傳統或零排放電動貨車以擴張日出貨容量。</div>
                </div>
                <div class="flex gap-2">
                    <button class="bg-gradient-to-r from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 text-slate-300 border border-slate-800 font-bold py-2 rounded text-xs flex-1 transition hover:scale-[1.02] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.buyLogisticsTruck('${corp.id}', 'normal')">
                        燃油貨車 (-$2M | 20噸)
                    </button>
                    <button class="bg-gradient-to-r from-emerald-950 to-slate-950 hover:from-emerald-900 hover:to-slate-900 text-emerald-400 border border-emerald-900 font-bold py-2 rounded text-xs flex-1 transition hover:scale-[1.02] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.buyLogisticsTruck('${corp.id}', 'ev')">
                        ⚡電動貨車 (-$5M | 20噸)
                    </button>
                </div>
            </div>
        </div>`;
 
        // 異業結盟 (Cyber Cards)
        html += `<h4 class="text-sm text-slate-300 font-bold mb-2">🤝 異業戰略結盟 (Exclusive Alliances)</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
            <div class="bg-slate-900 bg-opacity-60 border border-slate-800 p-3.5 rounded flex justify-between items-center hover:border-slate-700 transition">
                <div>
                    <div class="font-bold text-slate-200 text-sm">百貨零售龍頭物流包攬</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">保障車隊滿載率保底大於 80%，免受景氣影響</div>
                </div>
                ${corp.hasRetailAlliance ? 
                    `<span class="text-green-400 text-xs font-bold bg-green-950 bg-opacity-30 border border-green-900 px-2 py-0.5 rounded flex items-center gap-1">✔️ 已簽約</span>` :
                    `<button class="bg-orange-800 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded text-xs transition hover:scale-[1.02] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.signAlliance('${corp.id}', 'retail')">簽約 ($80M)</button>`
                }
            </div>
            <div class="bg-slate-900 bg-opacity-60 border border-slate-800 p-3.5 rounded flex justify-between items-center hover:border-slate-700 transition">
                <div>
                    <div class="font-bold text-slate-200 text-sm">大型跨國電商獨家承運</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">直通雲端包裹流，利潤保底大於 80%</div>
                </div>
                ${corp.hasSoftwareAlliance ? 
                    `<span class="text-green-400 text-xs font-bold bg-green-950 bg-opacity-30 border border-green-900 px-2 py-0.5 rounded flex items-center gap-1">✔️ 已簽約</span>` :
                    `<button class="bg-orange-800 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded text-xs transition hover:scale-[1.02] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.signAlliance('${corp.id}', 'software')">簽約 ($120M)</button>`
                }
            </div>
        </div>`;
        
        html += `</div>`;
        contentArea.innerHTML = html;
    },

    // D. 渲染大眾運輸面板 (科技鋼鐵深紅客製化載具儀表板)
    renderTransitTab(corp, contentArea, isReadOnly) {
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';
        
        // 3. 為每家公司客製化專屬大眾運輸載具名稱與運能參數
        let vType = '市區營業巴士';
        let vPrice = 5000000;
        let cap = 40;
        let vUnit = '人';
        let vDesc = '客運大巴，低折舊，高覆蓋。';
        
        if (corp.id === '2633') {
            vType = '高鐵 700T 列車';
            vPrice = 200000000;
            cap = 1000;
            vUnit = '人';
            vDesc = '極速城際軌道列車，高造價，高折舊，高耗電，高運量。';
        } else if (corp.id === '2640') {
            vType = '多元計程車';
            vPrice = 800000;
            cap = 4;
            vUnit = '人';
            vDesc = '黃色主力小客車，機動性極高，燃料維護極低。';
        } else if (corp.id === 'CSX') {
            vType = 'CSX 柴油貨運火車';
            vPrice = 120000000;
            cap = 2000;
            vUnit = '噸';
            vDesc = '美東重載貨運列車，柴油驅動，運力驚人。';
        } else if (corp.id === 'UNP') {
            vType = 'UNP 洲際鐵路列車';
            vPrice = 150000000;
            cap = 2500;
            vUnit = '噸';
            vDesc = '聯合太平洋橫貫大陸鐵路列車，地表最強陸運怪獸。';
        }
        
        let html = `<div class="p-5 bg-gradient-to-br from-gray-950 via-slate-900 to-black border border-slate-800 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.08)]">
            <div class="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                <h3 class="text-red-400 font-bold text-xl tracking-wider flex items-center gap-2">🚇 大眾運輸 (Public Transit Operations)</h3>
                <span class="text-xs bg-red-900 bg-opacity-40 text-red-300 border border-red-800 border-opacity-50 px-2 py-0.5 rounded font-mono">DASHBOARD</span>
            </div>
            
            <div class="mb-5 p-4 bg-slate-900 bg-opacity-60 border border-slate-800 rounded shadow-[inset_0_0_10px_rgba(255,255,255,0.01)] flex justify-between items-center">
                <div>
                    <div class="text-xs text-slate-400">當前票價/運費設定</div>
                    <div class="text-2xl font-extrabold text-white font-mono mt-0.5">$ ${corp.transitTicketPrice.toLocaleString()} <span class="text-xs text-slate-500 font-normal">/${vUnit}</span></div>
                    <div class="text-[10px] text-slate-500 mt-1">提示: 票價定價需契合票價彈性，過高會造成載客率崩塌！</div>
                </div>
                <button class="bg-red-800 hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-xs transition duration-300 hover:scale-[1.02] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.setTransitTicketPrice('${corp.id}')">
                    調整票價設定
                </button>
            </div>
            
            <h4 class="text-sm text-slate-300 font-bold mb-2">🚊 專屬載具購置與調配 (Vehicle Assets)</h4>
            <div class="bg-slate-900 bg-opacity-40 border border-slate-800 p-4 rounded-md flex justify-between items-center hover:border-slate-700 transition shadow-[inset_0_0_10px_rgba(255,255,255,0.01)]">
                <div>
                    <div class="font-bold text-slate-200 text-sm flex items-center gap-2">
                        <span>購買新【${vType}】</span>
                        <span class="text-xs bg-red-950 text-red-400 border border-red-900 px-2 py-0.5 rounded font-mono">目前擁有: ${corp.transitFleet.length} 輛</span>
                    </div>
                    <div class="text-[10px] text-slate-500 mt-1.5 max-w-sm">${vDesc}</div>
                </div>
                <button class="bg-gradient-to-r from-red-950 to-slate-950 hover:from-red-900 hover:to-slate-900 text-red-400 border border-red-900 font-bold px-4 py-3 rounded text-xs transition hover:scale-[1.03] ${disabledClass}" ${disabledAttr} onclick="CEO_TRANSPORT.buyTransitVehicle('${corp.id}', ${vPrice}, '${corp.id === '2633' ? 'hsr' : (corp.id === '2640' ? 'taxi' : 'bus')}', ${cap})">
                    <div class="font-bold">購置載具</div>
                    <div class="font-mono text-[10px] text-red-300 mt-0.5">$${app.formatMoney(vPrice)} | 運力: ${cap.toLocaleString()}${vUnit}</div>
                </button>
            </div>
        </div>`;
        contentArea.innerHTML = html;
    },

    // 1-E. 互動 Actions 客製化掛載
    buyMarineShip(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        
        let price = 0; let teu = 0; let dailyFuel = 0; let dailyMaint = 0;
        if (type === 'feeder') { price = 30000000; teu = 2000; dailyFuel = 15; dailyMaint = 10000; }
        else if (type === 'panamax') { price = 80000000; teu = 5000; dailyFuel = 30; dailyMaint = 25000; }
        else if (type === 'mega') { price = 150000000; teu = 15000; dailyFuel = 70; dailyMaint = 50000; }

        if (corp.corporateCash >= price) {
            corp.corporateCash -= price;
            if (!corp.marineFleet) corp.marineFleet = [];
            corp.marineFleet.push({ id: `S-${Date.now()}`, type: type, teu: teu, dailyFuel: dailyFuel, dailyMaint: dailyMaint, status: 'idle', assignedContractId: null });
            app.log(`【新船入港】${corp.name} 斥資 $${app.formatMoney(price)} 買入一艘 ${type} 級貨櫃輪，運力增加 ${teu.toLocaleString()} TEU！`, "text-cyan");
            app.updateUI();
            CEO_MODULE.switchTab('ops');
        } else {
            app.log(`【資金不足】需要 $${app.formatMoney(price)} 才能購買此船隻！`, "text-red-500");
        }
    },

    acceptMarineContract(corpId, bIdx) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.marineBiddingPool || !corp.marineBiddingPool[bIdx]) return;
        
        let contract = corp.marineBiddingPool[bIdx];
        
        // 尋找閒置船隻來填補 TEU 需求
        let idleShips = corp.marineFleet.filter(s => s.status === 'idle');
        idleShips.sort((a,b) => b.teu - a.teu); // 從大的開始塞
        
        let filledTeu = 0;
        let assignedShips = [];
        for (let ship of idleShips) {
            filledTeu += ship.teu;
            assignedShips.push(ship);
            if (filledTeu >= contract.teu) break;
        }
        
        if (filledTeu < contract.teu) {
            app.log(`【運力不足】${corp.name} 當前閒置運力 (${filledTeu.toLocaleString()} TEU) 不足接下此合約需求 (${contract.teu.toLocaleString()} TEU)！`, "text-red-500");
            return;
        }
        
        // 鎖定船隻狀態
        assignedShips.forEach(s => {
            s.status = 'contract';
            s.assignedContractId = contract.id;
            s.contractDays = contract.duration;
        });
        
        // 將合約從 pool 移至 active
        corp.marineBiddingPool.splice(bIdx, 1);
        if (!corp.marineContracts) corp.marineContracts = [];
        corp.marineContracts.push({
            id: contract.id,
            client: contract.client,
            cargo: contract.cargo,
            teu: contract.teu,
            duration: contract.duration,
            daysLeft: contract.duration,
            dailyRate: contract.dailyRate
        });
        
        app.log(`【簽約成功】${corp.name} 成功接下 ${contract.client} 的長約！鎖定了 ${assignedShips.length} 艘船，每日將賺取 $${app.formatMoney(contract.dailyRate)}。`, "text-green-400 font-bold");
        app.updateUI();
        CEO_MODULE.switchTab('ops');
    },

    buyFuelHedge(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        
        const price = 20000000;
        if (corp.corporateCash >= price) {
            corp.corporateCash -= price;
            if(!corp.fuelHedges) corp.fuelHedges = [];
            corp.fuelHedges.push({ lockedPrice: app.state.jetFuelPrice || 85, daysLeft: 90 });
            app.log(`【燃油避險】${corp.name} 斥資 $20M 買入燃油期貨，鎖定未來 90 天燃油價格為 $${(app.state.jetFuelPrice || 85).toFixed(2)}。`, "text-cyan");
            app.updateUI();
            CEO_MODULE.switchTab('ops');
        } else {
            app.log(`【資金不足】需要 $20M 才能進行燃油避險！`, "text-red-500");
        }
    },

    buyAirlineRoute(corpId, routeId, cost) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            if(!corp.unlockedRoutes) corp.unlockedRoutes = [];
            if(!corp.unlockedRoutes.includes(routeId)) {
                corp.unlockedRoutes.push(routeId);
                app.log(`【航權取得】${corp.name} 成功繳納航權金 $${app.formatMoney(cost)}，開通了新航線！`, "text-green-400 font-bold");
                app.updateUI();
                CEO_MODULE.switchTab('ops');
            }
        } else {
            app.log(`【資金不足】航權權利金需要 $${app.formatMoney(cost)}！`, "text-red-500");
        }
    },

    buyAirlinePlane(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        
        let price = 0; let seats = 0; let dailyFuel = 0; let dailyMaint = 0;
        if (type === 'narrow') { price = 60000000; seats = 180; dailyFuel = 40; dailyMaint = 15000; }
        else if (type === 'wide') { price = 150000000; seats = 350; dailyFuel = 80; dailyMaint = 35000; }
        else if (type === 'jumbo') { price = 300000000; seats = 550; dailyFuel = 150; dailyMaint = 60000; }

        if (corp.corporateCash >= price) {
            corp.corporateCash -= price;
            if (!corp.airlineFleet) corp.airlineFleet = [];
            corp.airlineFleet.push({ 
                id: `P-${Date.now()}`, type: type, seats: seats, 
                dailyFuel: dailyFuel, dailyMaint: dailyMaint, 
                assignedRoute: null,
                cabinConfig: { first: 0, business: Math.floor(seats*0.1), economy: seats - Math.floor(seats*0.1) }
            });
            app.log(`【新機引進】${corp.name} 斥資 $${app.formatMoney(price)} 引進新客機！擁有高達 ${seats} 席機位！`, "text-cyan");
            app.updateUI();
            CEO_MODULE.switchTab('ops');
        } else {
            app.log(`【資金不足】需要 $${app.formatMoney(price)} 才能購買此客機！`, "text-red-500");
        }
    },

    assignAirlinePlane(corpId, pIdx, routeId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.airlineFleet[pIdx]) return;
        corp.airlineFleet[pIdx].assignedRoute = routeId === "" ? null : routeId;
        app.log(`【航班調度】飛機 ${corp.airlineFleet[pIdx].id} 已重新派發。`, "text-cyan");
        app.updateUI();
        CEO_MODULE.switchTab('ops');
    },

    openCabinModal(corpId, pIdx) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.airlineFleet[pIdx]) return;
        let p = corp.airlineFleet[pIdx];
        
        let confirmStr = prompt(`當前座位總數: ${p.seats}\n輸入您想要的商務艙數量 (1商務艙 = 佔用2.5個經濟艙空間)：\n(目前商務艙: ${p.cabinConfig.business}, 經濟艙: ${p.cabinConfig.economy})`, p.cabinConfig.business);
        if(confirmStr !== null) {
            let bizCount = parseInt(confirmStr);
            if(!isNaN(bizCount) && bizCount >= 0) {
                let spaceNeeded = Math.ceil(bizCount * 2.5);
                if (spaceNeeded <= p.seats) {
                    p.cabinConfig.business = bizCount;
                    p.cabinConfig.economy = p.seats - spaceNeeded;
                    app.log(`【艙等改裝】飛機 ${p.id} 已完成改裝！商務艙 ${bizCount} 座，經濟艙 ${p.cabinConfig.economy} 座。`, "text-cyan");
                    app.updateUI();
                    CEO_MODULE.switchTab('ops');
                } else {
                    alert("空間不足！商務艙數量過多。");
                }
            }
        }
    },

    buildLogisticsHub(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        const price = 50000000;
        if (corp.corporateCash >= price) {
            corp.corporateCash -= price;
            corp.logisticsHubs = (corp.logisticsHubs || 0) + 1;
            app.log(`【基礎建設】${corp.name} 斥資 $50M 建設了一座 AI 自動化理貨中心！營運成本永久下降。`, "text-cyan");
            app.updateUI();
            CEO_MODULE.switchTab('ops');
        } else {
            app.log(`【資金不足】需要 $50M 才能建設理貨中心！`, "text-red-500");
        }
    },

    buyLogisticsTruck(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        let price = type === 'ev' ? 5000000 : 2000000;
        if (corp.corporateCash >= price) {
            corp.corporateCash -= price;
            if (!corp.logisticsFleet) corp.logisticsFleet = [];
            corp.logisticsFleet.push({ 
                id: `L-${Date.now()}`, type: 'heavy', capacity: 20, 
                isEV: type === 'ev', dailyFuel: type === 'ev' ? 0 : 45, dailyMaint: type === 'ev' ? 500 : 1000 
            });
            app.log(`【運力擴充】${corp.name} 購買了一輛${type==='ev'?'電動':'燃油'}貨車！`, "text-cyan");
            app.updateUI();
            CEO_MODULE.switchTab('ops');
        } else {
            app.log(`【資金不足】需要 $${app.formatMoney(price)} 才能購買此貨車！`, "text-red-500");
        }
    },

    signAlliance(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        let price = type === 'retail' ? 80000000 : 120000000;
        if (corp.corporateCash >= price) {
            corp.corporateCash -= price;
            if (type === 'retail') corp.hasRetailAlliance = true;
            if (type === 'software') corp.hasSoftwareAlliance = true;
            app.log(`【異業結盟】${corp.name} 斥資 $${app.formatMoney(price)} 簽下了${type==='retail'?'百貨零售':'電商網購'}獨家物流大單！`, "text-purple-400 font-bold");
            app.updateUI();
            CEO_MODULE.switchTab('ops');
        } else {
            app.log(`【資金不足】需要 $${app.formatMoney(price)} 才能簽訂此聯盟合約！`, "text-red-500");
        }
    },

    setTransitTicketPrice(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        let str = prompt("請輸入新的票價:", corp.transitTicketPrice);
        if (str !== null) {
            let val = parseInt(str);
            if (!isNaN(val) && val > 0) {
                corp.transitTicketPrice = val;
                app.log(`【票價調整】${corp.name} 宣布將票價調整為 $${val}。`, "text-yellow");
                app.updateUI();
                CEO_MODULE.switchTab('ops');
            }
        }
    },

    buyTransitVehicle(corpId, price, vType, cap) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        
        // 依據公司 ID 客製化定價與屬性，以防出錯
        let finalPrice = price;
        let finalCap = cap;
        let fuelCost = 50;
        let maintCost = 1000;
        let vehicleName = '營業載具';
        
        if (corp.id === '2633') {
            vehicleName = '高鐵 700T 列車';
            finalPrice = 200000000;
            finalCap = 1000;
            fuelCost = 500;
            maintCost = 50000;
        } else if (corp.id === '2640') {
            vehicleName = '黃色計程車';
            finalPrice = 800000;
            finalCap = 4;
            fuelCost = 10;
            maintCost = 1000;
        } else if (corp.id === 'CSX') {
            vehicleName = 'CSX 柴油貨運火車';
            finalPrice = 120000000;
            finalCap = 2000;
            fuelCost = 300;
            maintCost = 40000;
        } else if (corp.id === 'UNP') {
            vehicleName = 'UNP 洲際鐵路列車';
            finalPrice = 150000000;
            finalCap = 2500;
            fuelCost = 350;
            maintCost = 45000;
        } else {
            vehicleName = '市區營業巴士';
            finalPrice = 5000000;
            finalCap = 40;
            fuelCost = 50;
            maintCost = 1000;
        }

        if (corp.corporateCash >= finalPrice) {
            corp.corporateCash -= finalPrice;
            if (!corp.transitFleet) corp.transitFleet = [];
            corp.transitFleet.push({ 
                id: `V-${Date.now()}`, 
                type: vType, 
                capacity: finalCap, 
                dailyFuel: fuelCost, 
                dailyMaint: maintCost 
            });
            app.log(`【載具購置】${corp.name} 斥資 $${app.formatMoney(finalPrice)} 增購了一部 ${vehicleName}，運能大幅增加 ${finalCap.toLocaleString()}！`, "text-cyan");
            app.updateUI();
            CEO_MODULE.switchTab('ops');
        } else {
            app.log(`【資金不足】需要 $${app.formatMoney(finalPrice)} 才能購買此 ${vehicleName}！`, "text-red-500");
        }
    }
};

// 全域掛載
window.CEO_TRANSPORT = CEO_TRANSPORT;
