'use strict';
const sampleCSV = `Month,Region,Product,Revenue,Orders,Profit
Jan,North,Notebook,8400,120,2900
Jan,South,Markers,5600,90,1750
Feb,North,Notebook,9600,135,3300
Feb,South,Markers,6200,102,1990
Mar,North,Notebook,11600,155,4100
Mar,South,Markers,7900,113,2620
Apr,North,Notebook,10800,148,3820
Apr,South,Markers,9000,132,3090
May,North,Notebook,13100,178,4750
May,South,Markers,9800,142,3470
Jun,North,Notebook,15200,195,5510
Jun,South,Markers,11200,160,4050`;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
const short = n => new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n);
let columns=[],rows=[],filtered=[],page=0,currentChart=[],currentCSV=sampleCSV;
const PAGE_SIZE=8;
function parseDelimited(text,delimiter=',') {
  text=text.replace(/^\uFEFF/,'');let result=[],row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"'&&field==='')quoted=true;else if(c===delimiter){row.push(field);field='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()!==''))result.push(row);row=[];field='';}else field+=c;}
  if(quoted)throw Error('Unclosed quotation mark in data file.');
  row.push(field);if(row.some(x=>x.trim()!==''))result.push(row);
  if(!result.length)throw Error('The file is empty.');
  const headers=result.shift().map((x,i)=>x.trim()||`Column ${i+1}`);
  if(new Set(headers).size!==headers.length)throw Error('Column headings must be unique.');
  return { columns:headers,rows:result.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??'']))) };
}
function jsonDataset(text){const value=JSON.parse(text);if(!Array.isArray(value)||!value.length||value.some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw Error('JSON files must contain a nonempty array of flat objects.');const headers=[...new Set(value.flatMap(x=>Object.keys(x)))];if(!headers.length)throw Error('JSON records need named fields.');return {columns:headers,rows:value.map(obj=>Object.fromEntries(headers.map(h=>[h,obj[h]===null||obj[h]===undefined?'':typeof obj[h]==='object'?JSON.stringify(obj[h]):String(obj[h])])))}};
function numericColumns(){return columns.filter(c=>rows.some(r=>String(r[c]).trim()!=='')&&rows.every(r=>String(r[c]).trim()===''||Number.isFinite(Number(String(r[c]).replace(/[$,%\s]/g,'')))));}
function numberValue(v){let s=String(v??'').replace(/[$,%\s]/g,'');return s===''?NaN:Number(s);}
function loadDataset(data,name){if(!data.rows.length)throw Error('Your dataset has no data rows.');if(data.columns.length>60||data.rows.length>30000)throw Error('For performance, upload at most 30,000 rows and 60 columns.');columns=data.columns;rows=data.rows;page=0;$('#fileName').textContent=name;$('#fileMeta').textContent=`${fmt(rows.length)} rows · ${columns.length} columns · Loaded successfully`;
  const numeric=numericColumns();const x=$('#xColumn'),y=$('#yColumn');x.innerHTML=columns.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');y.innerHTML=numeric.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  x.value=columns.find(c=>!numeric.includes(c))||columns[0];if(numeric.includes('Revenue'))y.value='Revenue';else if(numeric.length)y.value=numeric[0];
  $('#aggregation').value='sum';$('#search').value='';$('#rowCount').textContent=`${fmt(rows.length)} records available`;refresh();
}
function refresh(){renderStats();renderChart();renderTable();}
function renderStats(){const numeric=numericColumns(),selected=$('#yColumn').value,vals=rows.map(r=>numberValue(r[selected])).filter(Number.isFinite);const distinct=new Set(rows.map(r=>r[$('#xColumn').value])).size;
  const items=[['TOTAL RECORDS',fmt(rows.length),'Rows in current file'],['DATA COLUMNS',fmt(columns.length),'Fields detected'],['UNIQUE CATEGORIES',fmt(distinct),$('#xColumn').value||'X-axis'],[selected?`TOTAL ${selected.toUpperCase()}`:'NUMERIC FIELDS',selected&&vals.length?short(vals.reduce((a,b)=>a+b,0)):fmt(numeric.length),selected?'Sum of numeric values':'Detected numeric columns']];
  $('#stats').innerHTML=items.map(([name,value,sub])=>`<article class="stat-card"><div class="tag">${esc(name)}</div><div class="number">${esc(value)}</div><div class="sub">${esc(sub)}</div></article>`).join('');
}
function buildChartData(){const x=$('#xColumn').value,y=$('#yColumn').value,agg=$('#aggregation').value,type=$('#chartType').value;
 if(!x)return [];
 if(type==='scatter'){return rows.map(r=>({category:r[x],value:numberValue(r[y]),xValue:numberValue(r[x])})).filter(d=>Number.isFinite(d.value)&&Number.isFinite(d.xValue)).slice(0,200);}
 const groups=new Map();for(const r of rows){const key=String(r[x]??'');const n=numberValue(r[y]);if(!groups.has(key))groups.set(key,{category:key,sum:0,count:0});const group=groups.get(key);if(agg==='count'){group.sum++;group.count++;}else if(Number.isFinite(n)){group.sum+=n;group.count++;}}
 return [...groups.values()].map(g=>({category:g.category,value:agg==='average'?(g.count?g.sum/g.count:0):g.sum})).slice(0,40);
}
function el(name,attributes={},text=''){const n=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v] of Object.entries(attributes))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;}
function renderChart(){const target=$('#chart');target.innerHTML='';const data=buildChartData(),type=$('#chartType').value;currentChart=data.map(d=>({category:d.category,value:d.value}));
 if(!data.length){target.textContent=type==='scatter'?'Scatter plot requires two numeric columns. Choose a numeric X-axis.':'No chartable values found. Select different columns.';return;}
 const svg=el('svg',{viewBox:'0 0 900 340',preserveAspectRatio:'xMidYMid meet','aria-label':`${type} chart of ${$('#yColumn').value} by ${$('#xColumn').value}`});target.appendChild(svg);
 if(type==='pie'){const total=data.reduce((s,d)=>s+Math.max(0,d.value),0);if(total<=0){target.textContent='Donut charts need positive values.';return;}let angle=-Math.PI/2;const cx=320,cy=163,r=120,inner=68;data.slice(0,10).forEach((d,i)=>{const fraction=Math.max(0,d.value)/total,span=fraction*2*Math.PI,a1=angle,a2=angle+Math.min(span,2*Math.PI-.000001);angle+=span*2*Math.PI;const pt=(rad,R)=>[cx+Math.cos(rad)*R,cy+Math.sin(rad)*R],p1=pt(a1,r),p2=pt(a2,r),p3=pt(a2,inner),p4=pt(a1,inner);const path=`M${p1} A${r} ${r} 0 ${span>.5?1:0} 1 ${p2} L${p3} A${inner} ${inner} 0 ${span>.5?1:0} 0 ${p4} Z`;svg.appendChild(el('path',{d:path,fill:palette(i)}));});svg.appendChild(el('text',{x:cx,y:154,'text-anchor':'middle','font-size':29,'font-weight':750,fill:'#24314c'},short(total)));svg.appendChild(el('text',{x:cx,y:177,'text-anchor':'middle','font-size':12,fill:'#8d99af'},'Total'));data.slice(0,10).forEach((d,i)=>{const yy=30+i*28;svg.appendChild(el('circle',{cx:565,cy:yy,r:6,fill:palette(i)}));svg.appendChild(el('text',{x:580,y:yy+4,'font-size':12,fill:'#536079'},truncate(d.category,23)));svg.appendChild(el('text',{x:820,y:yy+4,'text-anchor':'end','font-size':12,'font-weight':650,fill:'#24314c'},fmt(d.value)));});
 }else{const L=73,R=25,T=20,B=58,W=900-L-R,H=340-T-B;const values=data.map(d=>d.value),minVal=type==='scatter'?Math.min(0,...values):Math.min(0,...values),maxVal=Math.max(...values,1),lower=minVal<0?minVal*1.1:0,upper=maxVal<=0?1:maxVal*1.12,scaleY=v=>T+H-(v-lower)/(upper-lower)*H;
 for(let j=0;j<=5;j++){const val=lower+(upper-lower)*j/5,y=scaleY(val);svg.appendChild(el('line',{x1:L,x2:900-R,y1:y,y2:y,stroke:'#edf1f7'}));svg.appendChild(el('text',{x:L-12,y:y+4,'text-anchor':'end','font-size':11,fill:'#95a0b2'},short(val)));}
 if(type==='scatter'){const xs=data.map(d=>d.xValue);const xmin=Math.min(...xs),xmax=Math.max(...xs),range=xmax-xmin||1;data.forEach((d,i)=>svg.appendChild(el('circle',{cx:L+((d.xValue-xmin)/range)*W,cy:scaleY(d.value),r:5,fill:palette(i%6),opacity:.73})));for(let j=0;j<=5;j++){const xx=L+j/5*W;svg.appendChild(el('text',{x:xx,y:T+H+22,'text-anchor':'middle','font-size':11,fill:'#95a0b2'},short(xmin+j/5*range)));}}
 else{const n=data.length,gap=W/n;const xAt=i=>L+gap*(i+.5);if(type==='bar')data.forEach((d,i)=>{const y=scaleY(Math.max(0,d.value)),base=scaleY(0),neg=d.value<0;svg.appendChild(el('rect',{x:xAt(i)-Math.min(31,gap*.33),y:neg?base:y,width:Math.min(62,gap*.66),height:Math.max(1,Math.abs(base-scaleY(d.value))),rx:4,fill:palette(i%6)}));});
 else{const points=data.map((d,i)=>`${xAt(i)},${scaleY(d.value)}`).join(' ');svg.appendChild(el('polyline',{points,fill:'none',stroke:'#5671ef','stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'}));data.forEach((d,i)=>svg.appendChild(el('circle',{cx:xAt(i),cy:scaleY(d.value),r:3.5,fill:'#5671ef',stroke:'#fff','stroke-width':1.5})));}
 data.forEach((d,i)=>{if(data.length>16&&i%Math.ceil(data.length/12)!==0)return;svg.appendChild(el('text',{x:xAt(i),y:T+H+23,'text-anchor':'middle','font-size':10,fill:'#95a0b2'},truncate(d.category,12)));});}
 }
 $('#chartCaption').textContent=`${type==='scatter'?'Scatter plot':'Top '+data.length+' categories'} · ${$('#aggregation').value} of ${$('#yColumn').value||'records'} by ${$('#xColumn').value}`;
 renderStats();
}
function truncate(s,n){return String(s).length>n?String(s).slice(0,n-1)+'…':String(s);}
function palette(i){return ['#5b76ed','#91a5f7','#28b9a5','#ffbe75','#a58df4','#ed8b9a'][i%6];}
function renderTable(){const q=$('#search').value.trim().toLowerCase();filtered=q?rows.filter(r=>columns.some(c=>String(r[c]).toLowerCase().includes(q))):rows;const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));page=Math.min(page,totalPages-1);$('#tableHead').innerHTML='<tr>'+columns.map(c=>`<th>${esc(c)}</th>`).join('')+'</tr>';$('#tableBody').innerHTML=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map(r=>'<tr>'+columns.map(c=>`<td title="${esc(r[c])}">${esc(truncate(r[c],80))}</td>`).join('')+'</tr>').join('')||`<tr><td colspan="${columns.length}">No matching rows</td></tr>`;$('#tableCount').textContent=`${fmt(filtered.length)} rows`;
 $('#pageLabel').textContent=`Page ${page+1} of ${totalPages}`;$('#prevPage').disabled=page===0;$('#nextPage').disabled=page+1>=totalPages;
}
function csvFromData(){return [columns,...rows.map(r=>columns.map(c=>r[c]))].map(line=>line.map(v=>{const s=String(v??'');return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(',')).join('\r\n');}
$('#fileInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10*1024*1024)throw Error('File is too large (10 MB limit).');const text=await file.text(),dataset=file.name.toLowerCase().endsWith('.json')?jsonDataset(text):parseDelimited(text,file.name.toLowerCase().endsWith('.tsv')?'\t':',');loadDataset(dataset,file.name);currentCSV=csvFromData();$('#aiResult').textContent='Data loaded. Ask AI a question when you are ready.';}catch(error){alert('Could not read file: '+error.message);}finally{e.target.value='';}});
$('#sampleButton').addEventListener('click',()=>{currentCSV=sampleCSV;loadDataset(parseDelimited(sampleCSV),'sample_sales.csv');});
$('#downloadButton').addEventListener('click',()=>{const blob=new Blob([csvFromData()],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='datalens_export.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);});
$('#search').addEventListener('input',()=>{page=0;renderTable();});$('#prevPage').addEventListener('click',()=>{page--;renderTable();});$('#nextPage').addEventListener('click',()=>{page++;renderTable();});
for(const id of ['chartType','xColumn','yColumn','aggregation'])$('#'+id).addEventListener('change',renderChart);
const nameField=$('#ownerName');try{nameField.value=localStorage.getItem('datalens-owner')||'';}catch{}nameField.addEventListener('input',()=>{try{localStorage.setItem('datalens-owner',nameField.value);}catch{}});
$('#askAi').addEventListener('click',async()=>{const button=$('#askAi'),result=$('#aiResult');button.disabled=true;result.textContent='Generating insights…';try{const res=await fetch('/api/insights',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:$('#aiQuestion').value,summary:currentChart.slice(0,40)})});const json=await res.json();if(!res.ok)throw Error(json.error||`Request failed (${res.status}).`);result.textContent=json.answer;}catch(e){result.textContent=e.message==='Failed to fetch'?'AI requires deployment to Vercel (or a compatible local server) and a configured OPENAI_API_KEY.':e.message;}finally{button.disabled=false;}});
loadDataset(parseDelimited(sampleCSV),'sample_sales.csv');
