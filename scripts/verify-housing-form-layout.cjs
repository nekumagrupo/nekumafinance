const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    const page=await browser.newPage();
    const source=fs.readFileSync('outputs/finance-pwa/app.js','utf8');
    const start=source.indexOf('  function renderHousingServiceFormRow(');
    const renderer=source.slice(start,source.indexOf('\n  function ',start+1));
    await page.setContent('<main style="max-width:640px;margin:auto;padding:16px"><div id="fixture"></div></main>');
    await page.addStyleTag({content:fs.readFileSync('outputs/finance-pwa/styles.css','utf8')});
    await page.evaluate(src=>{
      const render=new Function('escapeAttr','escapeHtml','number','selectedAttr','authorLabel','bankAccountName','familyPayerOptions','hasFamilyAccess','housingPaymentMethodMeta',src+';return renderHousingServiceFormRow;');
      const row=render(String,String,Number,(a,b)=>a===b?'selected':'',()=>'',a=>a.nickname,()=>'<option>Responsavel principal da familia</option>',()=>true,{bank:'Conta bancaria',card:'Cartao',company:'Empresa'});
      document.querySelector('#fixture').innerHTML=row({key:'rent',label:'Aluguel',amount:80000,paymentMethod:'bank'},[],[{id:'bank',country:'japao',nickname:'Conta salario principal'}],[],'japao');
    },renderer);
    for (const width of [320,390,560,768,1280]) {
      await page.setViewportSize({width,height:1000});
      const result=await page.evaluate(()=>{
        const row=document.querySelector('.housing-form-row');
        const fields=[...row.querySelectorAll('.field')].filter(el=>getComputedStyle(el).display!=='none');
        const bounds=row.getBoundingClientRect();
        return {fits:fields.every(el=>{const r=el.getBoundingClientRect();return r.left>=bounds.left && r.right<=bounds.right+1;}),
          labelsFit:fields.every(el=>{const label=el.querySelector('label');return label.scrollWidth<=label.clientWidth+1;}),
          columns:getComputedStyle(row).gridTemplateColumns.split(' ').length};
      });
      assert.equal(result.fits,true,String(width));assert.equal(result.labelsFit,true,String(width));
      assert.equal(result.columns,width<=560?1:2,String(width));
      if(width===390){fs.mkdirSync('work',{recursive:true});await page.screenshot({path:'work/housing-form-fixed-390.png',fullPage:true});}
    }
    console.log('PASS: housing field bounds, label wrapping and responsive columns at 320/390/560/768/1280. Chromium fixture.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
