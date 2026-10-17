async function loadRecipeDB(){
  const indexRes=await fetch("./data/index.json",{cache:"no-store"});
  if(!indexRes.ok) throw new Error(`Recipe index failed: ${indexRes.status}`);
  const manifest=await indexRes.json();
  const DB={soups:[],smoothies:[]};
  for(const type of ["soups","smoothies"]){
    const chunks=await Promise.all(manifest[type].map(async entry=>{
      const res=await fetch(entry.file,{cache:"no-store"});
      if(!res.ok) throw new Error(`${entry.file} failed: ${res.status}`);
      return res.json();
    }));
    DB[type]=chunks.flat();
  }
  return DB;
}

async function boot(){
const DB=await loadRecipeDB();
const STORAGE_KEY="healthySoupsSmoothies_v3";
let STATE={schemaVersion:4,pantry:{},planned:[],made:{}};
try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
  if(saved&&typeof saved==="object") STATE={schemaVersion:saved.schemaVersion||3,pantry:saved.pantry||{},planned:saved.planned||[],made:saved.made||{}};
}catch(e){}

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(STATE))}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast._x);toast._x=setTimeout(()=>t.classList.remove("show"),1800)}
const $=s=>document.querySelector(s);

const fracMap={"¼":.25,"½":.5,"¾":.75,"⅓":1/3,"⅔":2/3,"⅛":.125,"⅜":.375,"⅝":.625,"⅞":.875};
function readNum(token){
  token=(token||"").trim();
  if(/[–-]/.test(token)){
    const parts=token.split(/[–-]/); return readNum(parts[parts.length-1]);
  }
  if(/^\d+(\.\d+)?$/.test(token)) return Number(token);
  let n=0, digits=token.match(/^\d+/);
  if(digits) n=Number(digits[0]);
  for(const [f,v] of Object.entries(fracMap)) if(token.includes(f)) n+=v;
  return n||null;
}
function prettyNum(n){
  if(n==null) return "";
  const near=(a,b)=>Math.abs(a-b)<.015;
  const whole=Math.floor(n), f=n-whole;
  const fs=near(f,.125)?"⅛":near(f,.25)?"¼":near(f,.333)?"⅓":near(f,.375)?"⅜":near(f,.5)?"½":near(f,.625)?"⅝":near(f,.667)?"⅔":near(f,.75)?"¾":near(f,.875)?"⅞":"";
  if(fs) return (whole?whole:"")+fs;
  return Number(n.toFixed(2)).toString();
}
function titleCase(s){return s.replace(/\b\w/g,c=>c.toUpperCase()).replace(/\bAnd\b/g,"and").replace(/\bOr\b/g,"or")}

function canonicalName(raw){
  const original=raw.toLowerCase();
  let s=original
    .replace(/\([^)]*\)/g," ")
    .replace(/,.*$/," ")
    .replace(/\b(roughly|finely|coarsely|thinly)\b/g," ")
    .replace(/\b(chopped|grated|drained|peeled|segmented|pitted|cored|stoned|sliced|removed|washed|skin|stalks?)\b/g," ")
    .replace(/\b(adjusted to max|or enough to remain below max|as needed|if needed|to taste)\b/g," ")
    .replace(/\s+/g," ").trim();

  // Keep pantry identities distinct when the physical thing you buy is different.
  if(/chicken stock cube/.test(s)) return "chicken stock cube";
  if(/beef stock cube/.test(s)) return "beef stock cube";
  if(/vegetable stock cube/.test(s)) return "vegetable stock cube";
  if(/fish stock cube/.test(s)) return "fish stock cube";
  if(/stock cube/.test(s)) return "stock cube";
  if(/chicken stock/.test(s)) return "chicken stock";
  if(/beef stock/.test(s)) return "beef stock";
  if(/vegetable stock/.test(s)) return "vegetable stock";
  if(/fish stock/.test(s)) return "fish stock";

  if(/orange zest/.test(original)) return "orange zest";
  if(/lemon zest/.test(original)) return "lemon zest";
  if(/lime zest/.test(original)) return "lime zest";
  if(/dried basil/.test(original)) return "dried basil";
  if(/fresh basil|basil leaves?/.test(original)) return "fresh basil";
  if(/dried mint/.test(original)) return "dried mint";
  if(/fresh mint|mint leaves?/.test(original)) return "fresh mint";
  if(/dried thyme/.test(original)) return "dried thyme";
  if(/fresh thyme/.test(original)) return "fresh thyme";
  if(/dried rosemary/.test(original)) return "dried rosemary";
  if(/fresh rosemary/.test(original)) return "fresh rosemary";
  if(/dried dill/.test(original)) return "dried dill";
  if(/fresh dill/.test(original)) return "fresh dill";
  if(/dried oregano/.test(original)) return "dried oregano";
  if(/fresh oregano/.test(original)) return "fresh oregano";
  if(/dried tarragon/.test(original)) return "dried tarragon";
  if(/fresh tarragon/.test(original)) return "fresh tarragon";
  if(/ground ginger/.test(original)) return "ground ginger";
  if(/ginger/.test(original)) return "fresh ginger";

  const rules=[
    [/spring onion/,"spring onion"],[/garlic/,"garlic"],[/onion/,"onion"],
    [/cooked chicken|chicken breast/,"cooked chicken"],[/cooked lean beef|cooked beef/,"cooked beef"],[/cooked lamb/,"cooked lamb"],[/cooked pork|roast pork/,"cooked pork"],[/cooked turkey/,"cooked turkey"],
    [/smoked bacon|bacon pieces/,"smoked bacon"],[/smoked ham|cooked ham/,"smoked ham"],[/ready-to-eat cured chorizo|cured chorizo|chorizo/,"chorizo"],
    [/smoked haddock/,"smoked haddock"],[/smoked trout/,"smoked trout"],[/sardine/,"tinned sardines"],[/prawn/,"cooked prawns"],[/crab meat|crab/,"crab meat"],[/salmon/,"cooked salmon"],[/tuna/,"tinned tuna"],[/mackerel/,"tinned mackerel"],[/mussel/,"cooked mussels"],[/cod/,"cooked cod"],[/white fish/,"cooked white fish"],[/mixed seafood/,"mixed seafood"],[/anchovy/,"anchovy fillets"],
    [/chestnut mushroom/,"chestnut mushrooms"],[/shiitake/,"shiitake mushrooms"],[/porcini/,"dried porcini"],[/mushroom/,"mushrooms"],
    [/roasted red pepper/,"roasted red peppers"],[/chopped tomato/,"chopped tomatoes"],[/tomato purée/,"tomato purée"],[/sweetcorn/,"sweetcorn"],[/baby spinach|spinach/,"spinach"],[/cauliflower/,"cauliflower"],[/frozen peas|peas/,"frozen peas"],[/leek/,"leek"],[/carrot/,"carrots"],[/kale/,"kale"],[/cucumber/,"cucumber"],[/fennel/,"fennel"],[/savoy cabbage|cabbage/,"cabbage"],[/beetroot/,"cooked beetroot"],
    [/greek yoghurt/,"Greek yoghurt"],[/plain yoghurt/,"plain yoghurt"],[/kefir/,"plain kefir"],[/double cream/,"double cream"],[/crème fraîche|creme fraiche/,"crème fraîche"],[/mascarpone/,"mascarpone"],[/whole milk/,"whole milk"],[/semi-skimmed milk/,"semi-skimmed milk"],[/coconut milk/,"coconut milk"],[/coconut water/,"coconut water"],[/almond drink/,"almond drink"],
    [/parmesan/,"Parmesan"],[/mature cheddar/,"mature Cheddar"],[/smoked cheddar/,"smoked Cheddar"],[/gruyère|gruyere/,"Gruyère"],[/feta/,"feta"],[/stilton/,"Stilton"],[/goat's cheese|goats cheese/,"goat's cheese"],[/manchego/,"Manchego"],[/cream cheese/,"cream cheese"],
    [/white miso|awase miso|miso/,"miso"],[/light soy sauce|soy sauce/,"soy sauce"],[/worcestershire/,"Worcestershire sauce"],[/marmite/,"Marmite"],[/tahini/,"tahini"],[/peanut butter/,"peanut butter"],[/almond butter/,"almond butter"],[/cashew butter/,"cashew butter"],[/hazelnut butter/,"hazelnut butter"],
    [/black pepper/,"black pepper"],[/white pepper/,"white pepper"],[/smoked paprika/,"smoked paprika"],[/paprika/,"paprika"],[/ground cumin|cumin/,"ground cumin"],[/curry powder/,"curry powder"],[/turmeric/,"turmeric"],[/thyme/,"dried thyme"],[/tarragon/,"dried tarragon"],[/rosemary/,"dried rosemary"],[/dill/,"dried dill"],[/basil/,"dried basil"],[/oregano/,"dried oregano"],[/saffron/,"saffron"],[/cayenne/,"cayenne"],[/chilli/,"chilli"],[/mace/,"mace"],[/nutmeg/,"nutmeg"],[/cinnamon/,"cinnamon"],[/cardamom/,"cardamom"],[/caraway/,"caraway"],[/sesame oil/,"sesame oil"],[/lime juice/,"lime juice"],[/lemon juice/,"lemon juice"],[/balsamic/,"balsamic vinegar"],[/fish sauce/,"fish sauce"],[/sherry/,"sherry"],[/port/,"port"],
    [/mango/,"mango"],[/pineapple/,"pineapple"],[/passion fruit/,"passion fruit"],[/cherries|cherry/,"cherries"],[/raspberries|raspberry/,"raspberries"],[/blueberries|blueberry/,"blueberries"],[/blackberries|blackberry/,"blackberries"],[/blackcurrants|blackcurrant/,"blackcurrants"],[/strawberries|strawberry/,"strawberries"],[/peach/,"peaches"],[/plums|plum/,"plums"],[/pear/,"pears"],[/apple/,"apples"],[/kiwi/,"kiwi"],[/papaya/,"papaya"],[/orange/,"oranges"],[/grapefruit/,"grapefruit"],[/guava/,"guava"],[/lychee/,"lychees"],[/dragon fruit/,"dragon fruit"],[/melon/,"melon"],[/watermelon/,"watermelon"],[/pomegranate juice/,"pomegranate juice"],[/cranberry juice/,"cranberry juice"],[/grapes|grape/,"grapes"],[/figs|fig/,"figs"],[/avocado/,"avocado"],[/banana/,"banana"],
    [/oats|oat/,"oats"],[/ground almonds|almonds/,"almonds"],[/walnuts|walnut/,"walnuts"],[/hazelnuts|hazelnut/,"hazelnuts"],[/pistachios|pistachio/,"pistachios"],[/dark chocolate/,"dark chocolate"],[/white chocolate/,"white chocolate"],[/cocoa powder|cocoa/,"cocoa powder"],[/vanilla extract|vanilla/,"vanilla"],[/instant espresso powder|espresso powder/,"espresso powder"],[/lemongrass/,"lemongrass"],
    [/rice/,"rice"],[/bulgur|freekeh/,"freekeh or bulgur"],[/tortilla chips/,"tortilla chips"],[/chestnuts|chestnut/,"cooked chestnuts"],
    [/water/,"water"]
  ];
  for(const [rx,name] of rules) if(rx.test(s)) return name;
  s=s.replace(/\b(cooked|ready-to-eat|jarred|plain|fresh|dried|ripe|small|medium|large|light|unsweetened|seedless|vacuum-packed|ground)\b/g," ").replace(/\s+/g," ").trim();
  return s || raw;
}

function naturalCountUnit(name,body){
  const low=body.toLowerCase();
  if(name==="garlic"||/garlic cloves?/.test(low)) return "clove";
  if(/stock cube/.test(name)||/stock cubes?/.test(low)) return "cube";
  if(name==="anchovy fillets"||/anchovy fillets?/.test(low)) return "fillet";
  if((name==="fresh basil"||name==="fresh mint")&&/leaves?/.test(low)) return "leaf";
  if(name==="lemongrass"&&/stalk/.test(low)) return "stalk";
  if(/\b(?:tin|can)(?:ned)?\b/.test(low)) return "tin";
  return "each";
}

function parseIngredient(raw){
  const low=raw.toLowerCase();
  const optional=/optional|if needed|as needed/.test(low);
  let s=raw.trim(), amount=null, unit=null, body=s;

  const pm=s.match(/^(?:([0-9¼½¾⅓⅔⅛⅜⅝⅞]+)\s+)?(?:tiny|small)?\s*pinch(?:\s+of)?\s+(.+)$/i);
  if(pm){
    amount=readNum(pm[1])||1;
    unit="pinch";
    body=pm[2];
  }else{
    const mm=s.match(/^([0-9¼½¾⅓⅔⅛⅜⅝⅞]+(?:[–-][0-9¼½¾⅓⅔⅛⅜⅝⅞]+)?)\s*(?:(?:heaped|level)\s+)?(kg|g|ml|l|tsp|tbsp)?\s+(.+)$/i);
    if(mm){amount=readNum(mm[1]);unit=(mm[2]||"each").toLowerCase();body=mm[3]}
  }

  let name=canonicalName(body);
  if(name==="water") return {raw,name,skip:true,optional:true,amount:null,unit:null};

  if(unit==="kg"){amount*=1000;unit="g"}
  if(unit==="l"){amount*=1000;unit="ml"}
  // Keep culinary spoon measures human-readable. tbsp is normalised to tsp so
  // planned recipes aggregate rather than creating separate tsp/tbsp lines.
  if(unit==="tbsp"){amount*=3;unit="tsp"}
  if(unit==="each") unit=naturalCountUnit(name,body);

  return {raw,name,skip:false,optional,amount,unit};
}

function unitLabel(unit,amount=null){
  if(unit==="each") return "×";
  if(unit==="tsp") return "tsp";
  if(unit==="ml"||unit==="g") return unit;
  const forms={
    pinch:["pinch","pinches"],
    clove:["clove","cloves"],
    cube:["cube","cubes"],
    fillet:["fillet","fillets"],
    leaf:["leaf","leaves"],
    stalk:["stalk","stalks"],
    tin:["tin","tins"]
  };
  if(forms[unit]) return amount===1?forms[unit][0]:forms[unit][1];
  return unit;
}

const recipeIndex={};
["soups","smoothies"].forEach(type=>DB[type].forEach((r,i)=>{
  r._id=type+":"+i;
  r._type=type;
  r._req=r.ing.map(parseIngredient).filter(x=>!x.skip);
  recipeIndex[r._id]=r;
}));

const catalog={};
Object.values(recipeIndex).forEach(r=>r._req.forEach(x=>{
  if(!catalog[x.name]) catalog[x.name]={name:x.name,units:{},hasUnquantified:false};
  if(x.amount!=null&&x.unit) catalog[x.name].units[x.unit]=Math.max(catalog[x.name].units[x.unit]||0,x.amount);
  else catalog[x.name].hasUnquantified=true;
}));
const catalogNames=Object.keys(catalog).sort((a,b)=>a.localeCompare(b));
const legacySpoonNames=new Set([
  "allspice","black pepper","white pepper","smoked paprika","paprika","ground cumin","curry powder","turmeric",
  "dried thyme","dried tarragon","dried rosemary","dried dill","dried basil","dried oregano","saffron","cayenne","chilli",
  "mace","nutmeg","cinnamon","cardamom","caraway","cocoa powder","espresso powder","english mustard","dijon mustard",
  "crushed curry leaves","vanilla"
]);
function migratePantryToV4(){
  if((STATE.schemaVersion||3)>=4) return;
  const old=STATE.pantry||{}, next={};
  function put(name,unit,amount,unlimited=false){
    if(!next[name]) next[name]={amounts:{},unlimited:false};
    if(unlimited) next[name].unlimited=true;
    if(unit&&amount>0) next[name].amounts[unit]=(next[name].amounts[unit]||0)+amount;
  }
  for(const [name,stock] of Object.entries(old)){
    if(stock?.unlimited){ put(name,null,0,true); continue; }
    const amounts=stock?.amounts||{};
    if(name==="garlic"){
      put("garlic","clove",amounts.each||0); continue;
    }
    if(/stock cube$/.test(name)){
      put(name,"cube",amounts.each||0); continue;
    }
    if(name==="basil"){
      if(amounts.ml) put("dried basil","tsp",amounts.ml/5);
      if(amounts.g) put("fresh basil","g",amounts.g);
      if(amounts.each) put("fresh basil","leaf",amounts.each);
      continue;
    }
    if(name==="mint"){
      if(amounts.ml) put("dried mint","tsp",amounts.ml/5);
      if(amounts.each) put("fresh mint","leaf",amounts.each);
      continue;
    }
    if(name==="ginger"){
      if(amounts.g) put("fresh ginger","g",amounts.g);
      if(amounts.ml) put("ground ginger","tsp",amounts.ml/5);
      if(amounts.pinch) put("ground ginger","pinch",amounts.pinch);
      continue;
    }
    for(const [u,a] of Object.entries(amounts)){
      if(u==="ml"&&legacySpoonNames.has(name)) put(name,"tsp",a/5);
      else if(u==="each"&&name==="anchovy fillets") put(name,"fillet",a);
      else put(name,u,a);
    }
  }
  STATE.pantry=next;
  STATE.schemaVersion=4;
  save();
}
migratePantryToV4();

function stockObj(name){
  if(!STATE.pantry[name]) STATE.pantry[name]={amounts:{},unlimited:false};
  if(!STATE.pantry[name].amounts) STATE.pantry[name].amounts={};
  return STATE.pantry[name];
}
function hasAnyStock(s){
  return !!s&&(s.unlimited||Object.values(s.amounts||{}).some(v=>v>0));
}
function hasRequirement(req){
  if(req.optional) return true;
  const s=STATE.pantry[req.name];
  if(!s) return false;
  if(s.unlimited) return true;
  if(req.amount==null) return hasAnyStock(s);
  return (s.amounts?.[req.unit]||0)+1e-9>=req.amount;
}
function recipeAvailability(r){
  const reqs=r._req.filter(x=>!x.optional);
  const have=reqs.filter(hasRequirement).length;
  return {have,total:reqs.length,ok:reqs.length>0&&have===reqs.length};
}
function setManualHave(name,on){
  const c=catalog[name],s=stockObj(name);
  if(!on){delete STATE.pantry[name];save();return}
  const units=Object.keys(c.units);
  if(!units.length){s.unlimited=true}
  else{
    s.unlimited=false;
    units.forEach(u=>{if(!(s.amounts[u]>0)) s.amounts[u]=c.units[u]});
  }
  save();
}
function setAmount(name,unit,val){
  const s=stockObj(name); s.unlimited=false; s.amounts[unit]=Math.max(0,Number(val)||0);
  if(Object.values(s.amounts).every(v=>!v)) delete STATE.pantry[name];
  save();
}
function addRequirementToPantry(req,amountOverride=null){
  const s=stockObj(req.name);
  if(req.amount==null){s.unlimited=true;save();return}
  s.amounts[req.unit]=(s.amounts[req.unit]||0)+(amountOverride==null?req.amount:amountOverride);
  save();
}
function consumeRecipe(r){
  r._req.filter(x=>!x.optional).forEach(req=>{
    const s=STATE.pantry[req.name]; if(!s||s.unlimited||req.amount==null) return;
    s.amounts[req.unit]=Math.max(0,(s.amounts[req.unit]||0)-req.amount);
    if(Object.values(s.amounts).every(v=>v<=1e-9)) delete STATE.pantry[req.name];
  });
  STATE.planned=STATE.planned.filter(id=>id!==r._id);
  STATE.made[r._id]=(STATE.made[r._id]||0)+1;
  save();
  toast("Made it ✓  Tracked ingredients deducted");
  renderAll();
}
function togglePlan(r){
  const i=STATE.planned.indexOf(r._id);
  if(i>=0){STATE.planned.splice(i,1);toast("Removed from shopping plan")}
  else{STATE.planned.push(r._id);toast("Added to shopping plan")}
  save();renderAll();
}
function aggregatePlanned(){
  const needs={};
  for(const id of STATE.planned){
    const r=recipeIndex[id]; if(!r) continue;
    for(const req of r._req){
      if(req.optional) continue;
      if(!needs[req.name]) needs[req.name]={name:req.name,amounts:{},unquantified:false};
      if(req.amount==null) needs[req.name].unquantified=true;
      else needs[req.name].amounts[req.unit]=(needs[req.name].amounts[req.unit]||0)+req.amount;
    }
  }
  return needs;
}
function missingShopping(){
  const needs=aggregatePlanned(), out=[];
  Object.values(needs).forEach(n=>{
    const s=STATE.pantry[n.name];
    if(s?.unlimited) return;
    const item={name:n.name,amounts:{},unquantified:n.unquantified&&!hasAnyStock(s)};
    for(const [u,a] of Object.entries(n.amounts)){
      const have=s?.amounts?.[u]||0, miss=Math.max(0,a-have);
      if(miss>1e-9) item.amounts[u]=miss;
    }
    if(item.unquantified||Object.keys(item.amounts).length) out.push(item);
  });
  return out.sort((a,b)=>a.name.localeCompare(b.name));
}
function qtyPart(amount,unit){
  if(unit==="each") return `${prettyNum(amount)} ×`;
  return `${prettyNum(amount)} ${unitLabel(unit,amount)}`;
}
function qtyText(item){
  const parts=Object.entries(item.amounts||{}).map(([u,a])=>qtyPart(a,u));
  if(!parts.length&&item.unquantified) return "as needed";
  return parts.length?parts.join(" + "):"in stock";
}

let tab="soups",cat="All",vis=[],oi=0,canOnly=false,plannedOnly=false;
const grid=$("#grid"),chips=$("#chips"),q=$("#q"),back=$("#back"),detail=$("#detail");

function cats(){return ["All",...new Set(DB[tab].map(r=>r.cat))]}
function drawChips(){
  chips.innerHTML="";
  cats().forEach(c=>{
    const b=document.createElement("button");
    b.className="chip"+(c===cat?" on":"");
    const n=c==="All"?DB[tab].length:DB[tab].filter(r=>r.cat===c).length;
    b.textContent=`${c} · ${n}`;
    b.onclick=()=>{cat=c;drawChips();drawRecipes()};
    chips.appendChild(b);
  });
}
function drawRecipes(){
  const s=q.value.trim().toLowerCase();
  vis=DB[tab].filter(r=>{
    const av=recipeAvailability(r);
    return (cat==="All"||r.cat===cat) &&
      (!s||JSON.stringify(r).toLowerCase().includes(s)) &&
      (!canOnly||av.ok) &&
      (!plannedOnly||STATE.planned.includes(r._id));
  });
  grid.innerHTML="";
  vis.forEach((r,i)=>{
    const av=recipeAvailability(r),planned=STATE.planned.includes(r._id),made=STATE.made[r._id]||0;
    const b=document.createElement("button");b.className="card";
    const extra=[
      av.ok?`<span class="tag ok">✓ Can make</span>`:`<span class="tag">${av.have}/${av.total} in</span>`,
      planned?`<span class="tag plan">🛒 Planned</span>`:"",
      made?`<span class="tag made">Made ${made}×</span>`:""
    ].join("");
    b.innerHTML=`<div class="k">${r.emoji} ${r.cat}</div><h3>${r.name}</h3><div class="desc">${r.desc}</div><div class="tags">${r.stats.map(x=>`<span class="tag">${x}</span>`).join("")}${extra}</div>`;
    b.onclick=()=>openR(i);grid.appendChild(b);
  });
  $("#count").textContent=`${vis.length} recipe${vis.length===1?"":"s"}`;
  $("#emptyRecipes").style.display=vis.length?"none":"block";
}
function openR(i){
  if(!vis.length)return;oi=(i+vis.length)%vis.length;const r=vis[oi],av=recipeAvailability(r),planned=STATE.planned.includes(r._id),made=STATE.made[r._id]||0;
  $("#idx").textContent=`${tab==="soups"?"Soup":"Smoothie"} ${oi+1} of ${vis.length} · ${r.cat}`;
  detail.innerHTML=`
    <div class="k">${r.emoji} ${r.cat}</div>
    <h2>${r.name}</h2><p class="lead">${r.desc}</p>
    <div class="tags"><span class="tag ${av.ok?"ok":""}">${av.ok?"✓ Can make now":`${av.have}/${av.total} ingredients in`}</span>${made?`<span class="tag made">Made ${made}×</span>`:""}</div>
    <div class="actionbar">
      <button id="planRecipe" class="action ${planned?"danger":"primary"}">${planned?"Remove from shopping plan":"🛒 Add to shopping plan"}</button>
      <button id="madeRecipe" class="action good">✓ I made this</button>
    </div>
    <div class="stats">${r.stats.map((x,j)=>`<div class="stat"><b>${x}</b><span>${j<2?"estimate / serving":"programme"}</span></div>`).join("")}</div>
    <section class="block"><h3>Ingredients · full 1 L batch</h3><ul>${r.ing.map(x=>`<li>${x}</li>`).join("")}</ul></section>
    <section class="block"><h3>Method</h3><ol>${r.method.map(x=>`<li>${x}</li>`).join("")}</ol></section>
    <section class="block"><h3>Nutritional strengths</h3><p>${r.science}</p></section>
    <section class="block"><div class="note"><strong>Machine note:</strong> ${r.note}</div></section>
    <p class="small">When you tap “I made this”, quantified pantry ingredients are reduced automatically. Unquantified seasonings remain marked as in stock because the recipe does not state how much was consumed.</p>`;
  $("#planRecipe").onclick=()=>{togglePlan(r);openR(oi)};
  $("#madeRecipe").onclick=()=>{consumeRecipe(r);openR(Math.min(oi,vis.length-1))};
  back.classList.add("open");document.body.style.overflow="hidden";
}
function closeR(){back.classList.remove("open");document.body.style.overflow=""}


function requirementKey(req){ return req.name+"||"+(req.unit||""); }

function missingMapForPlan(planIds){
  const needs={};
  for(const id of planIds){
    const r=recipeIndex[id]; if(!r) continue;
    for(const req of r._req){
      if(req.optional) continue;
      if(!needs[req.name]) needs[req.name]={name:req.name,amounts:{},unquantified:false};
      if(req.amount==null) needs[req.name].unquantified=true;
      else needs[req.name].amounts[req.unit]=(needs[req.name].amounts[req.unit]||0)+req.amount;
    }
  }
  const out={};
  for(const n of Object.values(needs)){
    const s=STATE.pantry[n.name];
    if(s?.unlimited) continue;
    if(n.unquantified && !hasAnyStock(s)){
      out[n.name+"||unquantified"]={name:n.name,unit:null,amount:null};
    }
    for(const [u,a] of Object.entries(n.amounts)){
      const have=s?.amounts?.[u]||0;
      const miss=Math.max(0,a-have);
      if(miss>1e-9) out[n.name+"||"+u]={name:n.name,unit:u,amount:miss};
    }
  }
  return out;
}

function candidateShopFit(r){
  const currentMap=missingMapForPlan(STATE.planned);
  const nextMap=missingMapForPlan([...STATE.planned,r._id]);

  let newIngredients=0, increasedExisting=0, extraNames=[];
  const currentNames=new Set(Object.values(currentMap).map(x=>x.name));

  for(const item of Object.values(nextMap)){
    const key=item.name+"||"+(item.unit||"unquantified");
    const before=currentMap[key];

    if(!currentNames.has(item.name)){
      newIngredients++;
      if(!extraNames.includes(item.name)) extraNames.push(item.name);
    } else {
      if(item.amount!=null){
        const beforeAmt=before?.amount||0;
        if(item.amount>beforeAmt+1e-9) increasedExisting++;
      } else if(!before){
        increasedExisting++;
      }
    }
  }

  // Ingredient overlap with all planned recipes, independent of pantry.
  const plannedIngredientNames=new Set();
  STATE.planned.forEach(id=>{
    const pr=recipeIndex[id];
    if(pr) pr._req.filter(x=>!x.optional).forEach(x=>plannedIngredientNames.add(x.name));
  });
  const candidateNames=new Set(r._req.filter(x=>!x.optional).map(x=>x.name));
  let overlap=0;
  candidateNames.forEach(n=>{ if(plannedIngredientNames.has(n)) overlap++; });
  const overlapPct=candidateNames.size ? overlap/candidateNames.size : 0;

  // Strongly prefer fewer genuinely new ingredient lines.
  // Quantity increases on ingredients already being bought are much cheaper than introducing new lines.
  const score = newIngredients*100 + increasedExisting*8 - overlapPct*20;
  return {score,newIngredients,increasedExisting,extraNames,overlapPct};
}

function renderSmartSuggestions(){
  const panel=$("#smartSuggestionsPanel"), box=$("#smartSuggestions");
  if(!STATE.planned.length){
    panel.style.display="none";
    box.innerHTML="";
    return;
  }

  const plannedSet=new Set(STATE.planned);
  const candidates=Object.values(recipeIndex)
    .filter(r=>!plannedSet.has(r._id))
    .map(r=>({r,...candidateShopFit(r)}))
    .sort((a,b)=>a.score-b.score || b.overlapPct-a.overlapPct || a.r.name.localeCompare(b.r.name))
    .slice(0,8);

  panel.style.display="block";
  box.innerHTML="";

  candidates.forEach(c=>{
    const d=document.createElement("div");
    d.className="suggest-card";
    const extraLabel = c.newIngredients===0 ? "0 new ingredients" :
      `${c.newIngredients} new ingredient${c.newIngredients===1?"":"s"}`;
    const extraClass = c.newIngredients===0 ? "extra-zero" : (c.newIngredients<=2 ? "extra-low" : "");
    const names = c.extraNames.length ? c.extraNames.slice(0,4).map(titleCase).join(", ") : "Nothing new";
    const typeLabel=c.r._type==="soups"?"Soup":"Smoothie";
    d.innerHTML=`
      <div class="k">${c.r.emoji} ${typeLabel} · ${c.r.cat}</div>
      <h4>${c.r.name}</h4>
      <div class="suggest-meta">
        <span class="tag ${extraClass}">${extraLabel}</span>
        <span class="tag">${Math.round(c.overlapPct*100)}% ingredient overlap</span>
      </div>
      <p>${c.newIngredients===0 ? "Uses only ingredients already in your pantry or current shop." : "Extra lines: "+names}</p>
      <div class="suggest-actions">
        <button class="action smallbtn preview">View</button>
        <button class="action smallbtn primary add">+ Add</button>
      </div>`;
    d.querySelector(".add").onclick=()=>{ togglePlan(c.r); };
    d.querySelector(".preview").onclick=()=>{
      tab=c.r._type;
      cat="All";
      q.value="";
      document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x.dataset.t===tab));
      $("#title").textContent=tab==="soups"?"Soup collection":"Smoothie collection";
      drawChips();drawRecipes();
      const i=vis.findIndex(x=>x._id===c.r._id);
      if(i>=0) openR(i);
    };
    box.appendChild(d);
  });
}

function renderShopping(){
  const plan=STATE.planned.map(id=>recipeIndex[id]).filter(Boolean);
  const missing=missingShopping();
  $("#plannedN").textContent=plan.length;$("#missingN").textContent=missing.length;$("#pantryN").textContent=Object.keys(STATE.pantry).length;
  $("#shoppingCount").textContent=`${missing.length} item${missing.length===1?"":"s"} to buy`;
  const pl=$("#plannedList");pl.innerHTML="";
  if(!plan.length) pl.innerHTML=`<div class="empty">Nothing planned yet. Open a recipe and tap “Add to shopping plan”.</div>`;
  else plan.forEach(r=>{
    const d=document.createElement("div");d.className="plan-card";
    d.innerHTML=`<div class="name"><b>${r.emoji} ${r.name}</b><span>${r._type==="soups"?"Soup":"Smoothie"} · ${r.cat}</span></div><button class="action smallbtn danger">Remove</button>`;
    d.querySelector("button").onclick=()=>{togglePlan(r)};
    pl.appendChild(d);
  });
  const sl=$("#shoppingList");sl.innerHTML="";
  if(!missing.length) sl.innerHTML=`<div class="empty">${plan.length?"Everything for your planned recipes is already marked as in the pantry.":"Plan a recipe and its missing ingredients will appear here."}</div>`;
  else missing.forEach(item=>{
    const row=document.createElement("label");row.className="row";
    const text=qtyText(item);
    row.innerHTML=`<input type="checkbox"><div class="rowname"><b>${titleCase(item.name)}</b><span class="sub">${text}</span></div><span class="tag">${text}</span>`;
    row.querySelector("input").onchange=e=>{
      if(!e.target.checked)return;
      if(item.unquantified&&!Object.keys(item.amounts||{}).length) addRequirementToPantry({name:item.name,amount:null,unit:null});
      Object.entries(item.amounts||{}).forEach(([unit,amount])=>addRequirementToPantry({name:item.name,amount,unit},amount));
      toast(`${titleCase(item.name)} added to pantry`);
      renderAll();
    };
    sl.appendChild(row);
  });
  renderSmartSuggestions();
}
function renderPantry(){
  const s=$("#pantrySearch").value.trim().toLowerCase();
  const names=catalogNames.filter(n=>n.toLowerCase().includes(s));
  $("#ingredientCount").textContent=`${names.length} ingredient${names.length===1?"":"s"}`;
  const list=$("#pantryList");list.innerHTML="";
  names.forEach(name=>{
    const c=catalog[name],stock=STATE.pantry[name],units=Object.keys(c.units);
    const checked=!!stock&&(stock.unlimited||Object.values(stock.amounts||{}).some(v=>v>0));
    const row=document.createElement("div");row.className="row";
    const controls=units.length ? units.map(u=>{
      const val=stock?.amounts?.[u]||0;
      return `<div class="qty"><input data-u="${u}" type="number" step="0.01" min="0" value="${val?Number(val.toFixed(2)):""}" placeholder="${Number(c.units[u].toFixed(2))}"><span class="unit">${unitLabel(u,val||null)}</span></div>`
    }).join("") : `<span class="tag">${stock?.unlimited?"in stock":"staple"}</span>`;
    row.innerHTML=`<input class="have" type="checkbox" ${checked?"checked":""}><div class="rowname"><b>${titleCase(name)}</b><span class="sub">${units.length?"Tracked quantity":"Unquantified in recipes"}</span></div><div>${controls}</div>`;
    row.querySelector(".have").onchange=e=>{setManualHave(name,e.target.checked);renderAll()};
    row.querySelectorAll("input[data-u]").forEach(inp=>inp.onchange=e=>{setAmount(name,e.target.dataset.u,e.target.value);renderAll()});
    list.appendChild(row);
  });
}
function renderAll(){drawRecipes();renderShopping();renderPantry()}

document.querySelectorAll(".primary button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".primary button").forEach(x=>x.classList.toggle("on",x===b));
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("on"));
  $("#"+b.dataset.view+"View").classList.add("on");
  if(b.dataset.view==="shopping")renderShopping();
  if(b.dataset.view==="pantry")renderPantry();
});
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  tab=b.dataset.t;cat="All";q.value="";
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x===b));
  $("#title").textContent=tab==="soups"?"Soup collection":"Smoothie collection";
  drawChips();drawRecipes()
});
q.oninput=drawRecipes;
$("#canMakeToggle").onclick=()=>{canOnly=!canOnly;$("#canMakeToggle").classList.toggle("on",canOnly);drawRecipes()};
$("#plannedToggle").onclick=()=>{plannedOnly=!plannedOnly;$("#plannedToggle").classList.toggle("on",plannedOnly);drawRecipes()};
$("#pantrySearch").oninput=renderPantry;
$("#clearPlan").onclick=()=>{STATE.planned=[];save();toast("Shopping plan cleared");renderAll()};
$("#buyAll").onclick=()=>{missingShopping().forEach(item=>{if(item.unquantified&&!Object.keys(item.amounts||{}).length)addRequirementToPantry({name:item.name,amount:null,unit:null});Object.entries(item.amounts||{}).forEach(([unit,amount])=>addRequirementToPantry({name:item.name,amount,unit},amount))});toast("Shopping list moved to pantry");renderAll()};
$("#close").onclick=closeR;$("#prev").onclick=()=>openR(oi-1);$("#next").onclick=()=>openR(oi+1);
back.onclick=e=>{if(e.target===back)closeR()};
document.onkeydown=e=>{if(e.key==="Escape")closeR();if(back.classList.contains("open")&&e.key==="ArrowRight")openR(oi+1);if(back.classList.contains("open")&&e.key==="ArrowLeft")openR(oi-1)};

drawChips();renderAll();

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(err=>console.warn("Service worker registration failed",err));
}
}

boot().catch(err=>{
  console.error(err);
  const wrap=document.querySelector(".wrap")||document.body;
  const d=document.createElement("div");
  d.className="boot-error";
  d.textContent="The recipe library could not load. If you are offline, open the app once while connected so it can cache the latest version.";
  wrap.prepend(d);
});
