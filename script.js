"use strict";

// URL gerada ao implantar o Google Apps Script como Aplicativo da Web.
const SHEETS_WEB_APP_URL="https://script.google.com/macros/s/AKfycbxMsj3rc4QwEeRNpDLyvA46-iwS_OQryvxeNFVBdDGNKlaVId_tcyhl0GsvRNarIAVD/exec";

const LEAD_GATE_AFTER=3;

const PROFILES={
 creative:{name:"Criativo Comunicador",icon:"✦",summary:"Você enxerga possibilidades onde outras pessoas veem o comum. Ideias, expressão e conexão são seus combustíveis — seu talento cresce quando pode criar e comunicar.",strengths:["Criatividade e imaginação","Comunicação envolvente","Facilidade para gerar ideias","Sensibilidade estética e cultural"],careers:["Design","Marketing","Publicidade","Conteúdo","Fotografia","Eventos"],courses:["Marketing Digital","Oratória","Canva","Design Gráfico"]},
 analytical:{name:"Lógico Analítico",icon:"⌁",summary:"Você gosta de entender como as coisas funcionam e encontrar respostas consistentes. Seu olhar atento, organizado e racional ajuda a resolver problemas com precisão.",strengths:["Raciocínio lógico","Atenção aos detalhes","Organização e planejamento","Resolução de problemas"],careers:["Tecnologia","Engenharia","Finanças","Dados","Programação","Qualidade"],courses:["Programação","Python","Excel Avançado com Power BI","Inteligência Artificial: ChatGPT e Claude"]},
 practical:{name:"Prático Executor",icon:"⚙",summary:"Você aprende fazendo e sente satisfação ao transformar planos em resultados concretos. Agilidade, objetividade e disposição para colocar a mão na massa são suas marcas.",strengths:["Agilidade na execução","Objetividade","Habilidade manual e técnica","Foco em resultados concretos"],careers:["Mecânica","Logística","Construção","Eletrotécnica","Manutenção","Produção"],courses:["Montagem e Manutenção de Computadores e Redes","Informática com IA","Desenvolvimento de Games","Programação"]},
 social:{name:"Cuidador Social",icon:"♥",summary:"Você percebe as necessidades das pessoas e se realiza quando pode apoiar, ensinar ou melhorar o dia de alguém. Empatia e cooperação são a base do seu talento.",strengths:["Empatia e escuta","Trabalho em equipe","Paciência para ensinar","Senso de responsabilidade"],careers:["Saúde","Educação","Psicologia","Recursos Humanos","Estética","Serviço social"],courses:["Atendente de Farmácia","Oratória","Atendimento e Vendas","Inglês"]},
 commercial:{name:"Empreendedor Comercial",icon:"↗",summary:"Você identifica oportunidades, mobiliza pessoas e gosta de desafios com metas claras. Sua energia para negociar e liderar pode transformar ideias em negócios reais.",strengths:["Iniciativa e liderança","Poder de negociação","Visão de oportunidades","Orientação para metas"],careers:["Vendas","Empreendedorismo","Gestão","Comércio","Negócios digitais","Representação"],courses:["Rotinas Administrativas","Atendimento e Vendas","Marketing Digital","Excel Avançado com Power BI"]}
};
const Q=[
 ["Em um trabalho em grupo, qual papel você assume naturalmente?",["Apresento as ideias e cuido do visual","Organizo os dados e a estratégia","Coloco as tarefas em prática","Escuto todos e ajudo o grupo","Lidero e busco o melhor resultado"]],
 ["Qual atividade faz você perder a noção do tempo?",["Criar, desenhar, escrever ou editar","Resolver enigmas ou pesquisar","Montar, consertar ou construir","Conversar e ajudar alguém","Planejar formas de ganhar dinheiro"]],
 ["Quando surge um problema inesperado, você costuma…",["Inventar uma solução diferente","Analisar as causas antes de agir","Testar logo uma solução possível","Pensar em quem será afetado","Assumir o controle da situação"]],
 ["Qual elogio mais combina com você?",["Você tem ideias incríveis","Você pensa em tudo","Você faz acontecer","Você sabe acolher as pessoas","Você nasceu para liderar"]],
 ["Que tipo de conteúdo mais chama sua atenção?",["Arte, música, tendências e cultura","Ciência, tecnologia e curiosidades","Tutoriais e projetos passo a passo","Comportamento, saúde e histórias reais","Negócios, dinheiro e liderança"]],
 ["Em qual ambiente você se imagina trabalhando?",["Um estúdio cheio de referências","Um espaço organizado e tecnológico","Uma oficina, laboratório ou operação","Um lugar com contato humano","Um ambiente dinâmico de negócios"]],
 ["Como você prefere aprender algo novo?",["Explorando e criando do meu jeito","Entendendo a teoria e a lógica","Praticando com exemplos reais","Trocando experiências com alguém","Com um desafio e uma meta"]],
 ["Se pudesse criar um projeto para a escola, seria…",["Uma campanha ou mostra artística","Um aplicativo ou experimento","Uma solução física para o dia a dia","Uma ação para ajudar a comunidade","Uma feira de negócios"]],
 ["O que mais pesa na escolha de uma profissão?",["Liberdade para me expressar","Desafios intelectuais","Ver o resultado do meu trabalho","Fazer diferença na vida das pessoas","Crescimento e ganhos"]],
 ["Seus amigos procuram você quando precisam de…",["Uma ideia original","Uma opinião bem pensada","Ajuda para resolver algo na prática","Conselho e apoio","Coragem para tomar uma decisão"]],
 ["Qual dessas tarefas parece mais interessante?",["Criar a identidade de uma marca","Analisar informações de uma pesquisa","Instalar ou configurar um equipamento","Orientar uma pessoa em dificuldade","Apresentar e vender um projeto"]],
 ["Diante de uma meta difícil, o que mais ajuda você?",["Imaginar novas possibilidades","Dividir o problema em etapas","Começar e ajustar no caminho","Ter pessoas colaborando","A competição e o desafio"]],
 ["Qual matéria ou área parece mais próxima de você?",["Linguagens e artes","Matemática e ciências","Tecnologia e atividades práticas","Humanas e biologia","Economia e projetos"]],
 ["Como seria um dia de trabalho ideal?",["Variado, criativo e cheio de ideias","Com problemas complexos para resolver","Ativo e com tarefas concretas","Com colaboração e contato com pessoas","Com decisões, metas e negociações"]],
 ["Qual frase representa melhor você?",["Sempre existe outro jeito de olhar","Quero entender antes de concluir","Ideia boa é ideia colocada em prática","Crescemos quando ajudamos uns aos outros","Oportunidades são feitas para aproveitar"]]
];
// Mantém o teste curto: somente as dez primeiras perguntas são utilizadas.
Q.length=10;
const KEYS=["creative","analytical","practical","social","commercial"];
const state={current:0,answers:[],scores:{},lead:null};
const $=s=>document.querySelector(s);
const screens=document.querySelectorAll(".screen");
function show(id){screens.forEach(x=>x.classList.toggle("active",x.id===id));scrollTo({top:0,behavior:"smooth"})}
function startQuiz(){state.current=0;renderQuestion();track("quiz_started");show("quiz")}
function continueQuizAfterLead(){state.current=LEAD_GATE_AFTER;renderQuestion();show("quiz")}
function renderQuestion(){
 const q=Q[state.current],n=state.current+1,p=Math.round(n/Q.length*100);
 $("#question-title").textContent=q[0];$("#question-number").textContent=String(n).padStart(2,"0");
 $("#progress-label").textContent="Pergunta "+n+" de "+Q.length;$("#progress-percent").textContent=p+"%";$("#progress-bar").style.width=p+"%";
 $(".progress").setAttribute("aria-valuenow",n);$("#back").style.visibility=n===1?"hidden":"visible";
 $("#answers").innerHTML="";
 q[1].forEach((label,i)=>{const b=document.createElement("button");b.type="button";b.className="answer"+(state.answers[state.current]===KEYS[i]?" selected":"");b.innerHTML='<span class="letter">'+String.fromCharCode(65+i)+'</span><span>'+label+'</span>';b.onclick=()=>select(KEYS[i],b);$("#answers").appendChild(b)});
}
function select(key,b){
 document.querySelectorAll(".answer").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");state.answers[state.current]=key;
 setTimeout(async()=>{
   if(state.current===LEAD_GATE_AFTER-1&&!state.lead){track("lead_gate_viewed",{after_questions:LEAD_GATE_AFTER});show("lead-gate");return}
   if(state.current<Q.length-1){state.current++;renderQuestion();scrollTo({top:0,behavior:"smooth"});return}
   await finishQuiz();
 },180)
}
function calculate(){state.scores=Object.fromEntries(KEYS.map(k=>[k,0]));state.answers.forEach(k=>state.scores[k]++)}
function mainProfile(){return KEYS.reduce((best,k)=>state.scores[k]>state.scores[best]?k:best)}
function mask(e){let d=e.target.value.replace(/\D/g,"").slice(0,11);e.target.value=d.length<=2?"("+d:d.length<=6?d.replace(/(\d{2})(\d+)/,"($1) $2"):d.length<=10?d.replace(/(\d{2})(\d{4})(\d+)/,"($1) $2-$3"):d.replace(/(\d{2})(\d{5})(\d+)/,"($1) $2-$3")}
function valid(form){let ok=true;form.querySelectorAll("[required]").forEach(f=>{const value=f.value.trim(),bad=!value||(f.type==="tel"&&value.replace(/\D/g,"").length<10)||(f.type==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));f.classList.toggle("invalid",bad);if(bad)ok=false});return ok}
async function submitLead(e){
 e.preventDefault();const form=e.currentTarget;
 if(!valid(form)){$("#form-error").textContent="Preencha corretamente seu nome, WhatsApp e e-mail para continuar o teste.";form.querySelector(".invalid")?.focus();return}
 $("#form-error").textContent="";const btn=form.querySelector("[type=submit]");btn.disabled=true;btn.textContent="Salvando…";
 const data=Object.fromEntries(new FormData(form));
 state.lead={id:crypto.randomUUID?crypto.randomUUID():"lead-"+Date.now(),createdAt:new Date().toISOString(),studentName:data.studentName.trim(),studentWhatsapp:data.studentWhatsapp.trim(),studentEmail:data.studentEmail.trim().toLowerCase(),profile:"",profileKey:"",scores:{},answers:[...state.answers],source:"quiz-perfil-carreira",status:"Em andamento"};
 await saveLead(state.lead);trackMetaStandard("Lead");track("lead_submitted",{stage:"after_3_questions"});
 continueQuizAfterLead();btn.disabled=false;btn.innerHTML='Continuar meu teste <span>→</span>';
}
async function finishQuiz(){
 calculate();const key=mainProfile();
 state.lead={...state.lead,profile:PROFILES[key].name,profileKey:key,scores:{...state.scores},answers:[...state.answers],status:"Concluído",completedAt:new Date().toISOString()};
 await saveLead(state.lead);renderResult(key);track("quiz_completed",{profile:key});show("result");
}
async function saveLead(lead){
 // Backup local: o resultado nunca é perdido caso a internet esteja indisponível.
 const leads=JSON.parse(localStorage.getItem("careerQuizLeads")||"[]");
 const existingIndex=leads.findIndex(item=>item.id===lead.id);
 if(existingIndex>=0) leads[existingIndex]=lead; else leads.push(lead);
 localStorage.setItem("careerQuizLeads",JSON.stringify(leads));

 if(!SHEETS_WEB_APP_URL||SHEETS_WEB_APP_URL.includes("SUA_URL")){
   console.warn("Google Sheets ainda não configurado: informe SHEETS_WEB_APP_URL.");
   return {savedLocally:true,sentToSheets:false};
 }

 const payload=JSON.stringify(lead);
 console.info("[Sheets] Enviando lead",{
   id:lead.id,
   nome:lead.studentName,
   whatsapp:lead.studentWhatsapp,
   email:lead.studentEmail,
   status:lead.status
 });

  try{
    // text/plain evita a requisição OPTIONS que costuma ser bloqueada pelo Apps Script.
    // no-cors gera uma resposta opaca: o recebimento é confirmado diretamente na planilha.
    await fetch(SHEETS_WEB_APP_URL,{
     method:"POST",
     mode:"no-cors",
     headers:{"Content-Type":"text/plain;charset=utf-8"},
     body:payload,
     cache:"no-store",
     redirect:"follow",
     keepalive:true
    });
    return {savedLocally:true,sentToSheets:true};
  }catch(error){
    console.error("Não foi possível enviar o lead ao Google Sheets:",error);
    // Em celulares, tenta enfileirar o envio caso a requisição principal seja interrompida.
    if(navigator.sendBeacon){
      const queued=navigator.sendBeacon(SHEETS_WEB_APP_URL,new Blob([payload],{type:"text/plain;charset=utf-8"}));
      console.info("[Sheets] Beacon de contingência enviado/na fila:",queued);
      return {savedLocally:true,sentToSheets:queued,error:error.message};
    }
    return {savedLocally:true,sentToSheets:false,error:error.message};
  }
}

function renderResult(key){
 const p=PROFILES[key];$("#result-icon").textContent=p.icon;$("#result-title").textContent=p.name;$("#result-summary").textContent=p.summary;
 $("#strengths").innerHTML=p.strengths.map(x=>"<li>"+x+"</li>").join("");$("#careers").innerHTML=p.careers.map(x=>"<span>"+x+"</span>").join("");$("#courses").innerHTML=p.courses.map(x=>"<li>"+x+"</li>").join("");
 $("#score-list").innerHTML=Object.entries(state.scores).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{const pc=Math.round(v/Q.length*100);return '<div class="score-row"><span>'+PROFILES[k].name+'</span><div class="score-track"><div class="score-fill" style="width:'+pc+'%"></div></div><span>'+pc+'%</span></div>'}).join("");
 // Troque abaixo pelo WhatsApp oficial com DDI + DDD, somente números.
 const teamWhatsapp="5522998200315",student=(state.lead.studentName||"").split(" ")[0],msg=encodeURIComponent("Olá! Sou "+student+" e fiz o Teste de Perfil. Meu resultado foi "+p.name+". Quero saber mais sobre os cursos.");
 $("#whatsapp").href="https://wa.me/"+teamWhatsapp+"?text="+msg;
}
function track(name,params={}){
 if(window.fbq) window.fbq("trackCustom",name,params);
 // GOOGLE ANALYTICS: após instalar, descomente: if(window.gtag) window.gtag("event",name,params);
 console.info("[Analytics]",name,params);
}
function trackMetaStandard(name,params={}){
 if(window.fbq) window.fbq("track",name,params);
 console.info("[Meta Pixel]",name,params);
}
$("#start-test").onclick=startQuiz;
$("#back").onclick=()=>{if(state.current>0){state.current--;renderQuestion()}};
$("#gate-back").onclick=()=>{state.current=LEAD_GATE_AFTER-1;renderQuestion();show("quiz")};
document.querySelectorAll('input[type="tel"]').forEach(x=>x.addEventListener("input",mask));
$("#lead-form").addEventListener("submit",submitLead);
$("#restart").onclick=()=>{state.current=0;state.answers=[];state.scores={};state.lead=null;$("#lead-form").reset();show("welcome")};
window.addEventListener("beforeunload",e=>{if(state.answers.length&&!state.lead){e.preventDefault();e.returnValue=""}});
