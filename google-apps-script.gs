/**
 * Backend do quiz: salva/atualiza o lead no Google Sheets e cadastra
 * o mesmo contato na lista do Brevo sem expor a chave da API no site.
 */
const SHEET_NAME = "Leads";
const SPREADSHEET_ID = "1o8Ll6l2By7BaiO41kxKlm6j6fX7C_2v4qa9Zp_oU0MI";
const HEADERS = [
  "ID",
  "Data do cadastro",
  "Nome",
  "WhatsApp",
  "Aceite da privacidade",
  "Perfil",
  "Pontuações",
  "Respostas",
  "Origem",
  "Status",
  "E-mail",
  "Brevo"
];

function doGet() {
  const properties = PropertiesService.getScriptProperties();

  return jsonResponse({
    ok: true,
    message: "Integração do quiz ativa.",
    brevoConfigured: Boolean(properties.getProperty("BREVO_API_KEY")),
    brevoListConfigured: Boolean(properties.getProperty("BREVO_LIST_ID"))
  });
}

/**
 * Execute manualmente uma vez no editor do Apps Script para autorizar
 * o acesso externo e confirmar que a chave do Brevo está funcionando.
 */
function authorizeBrevo() {
  const apiKey = PropertiesService.getScriptProperties().getProperty(
    "BREVO_API_KEY"
  );

  if (!apiKey) {
    throw new Error("BREVO_API_KEY não configurada nas propriedades do script.");
  }

  const response = UrlFetchApp.fetch("https://api.brevo.com/v3/account", {
    method: "get",
    headers: {
      accept: "application/json",
      "api-key": apiKey
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(
      "Não foi possível validar a conta Brevo: " +
        response.getContentText().slice(0, 300)
    );
  }

  console.log("Brevo autorizado e chave validada com sucesso.");
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    const lead = JSON.parse((e.postData && e.postData.contents) || "{}");
    // Normaliza antes de salvar para a planilha e para o Brevo receberem o mesmo número.
    lead.studentWhatsapp = formatBrazilPhoneNational(lead.studentWhatsapp);
    validateLead(lead);

    // O cadastro no Brevo é tentado já no primeiro envio ("Em andamento").
    // Se o Brevo falhar, a planilha ainda recebe o lead e registra o motivo.
    let brevoResult;
    try {
      brevoResult = saveToBrevo(lead);
    } catch (brevoError) {
      console.error("Falha ao enviar contato ao Brevo: " + brevoError.message);
      brevoResult = { ok: false, error: brevoError.message };
    }

    const sheetAction = saveToSheet(lead, brevoResult);

    return jsonResponse({
      ok: true,
      id: lead.id,
      sheetAction: sheetAction,
      brevo: brevoResult
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: error.message });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function saveToSheet(lead, brevoResult) {
  // Abre a planilha correta mesmo que o Apps Script não esteja vinculado a ela.
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet =
    spreadsheet.getSheetByName(SHEET_NAME) ||
    spreadsheet.insertSheet(SHEET_NAME);

  // Também atualiza automaticamente a planilha antiga com as colunas novas.
  sheet
    .getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight("bold")
    .setBackground("#0758d5")
    .setFontColor("#ffffff");
  sheet.setFrozenRows(1);

  const row = [
    safeCell(lead.id),
    lead.createdAt ? new Date(lead.createdAt) : new Date(),
    safeCell(lead.studentName),
    safeCell(lead.studentWhatsapp),
    "Não solicitado",
    safeCell(lead.profile),
    JSON.stringify(lead.scores || {}),
    JSON.stringify(lead.answers || []),
    safeCell(lead.source),
    safeCell(lead.status || "Em andamento"),
    safeCell(lead.studentEmail),
    brevoResult.ok ? "Enviado" : "Falhou: " + safeCell(brevoResult.error)
  ];

  const existingRow = findLeadRow(sheet, lead.id);

  // Primeiro envio cria a linha; a conclusão atualiza exatamente a mesma linha.
  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues([row]);
    console.log("Lead atualizado: " + lead.id);
    return "updated";
  }

  sheet.appendRow(row);
  console.log("Lead cadastrado: " + lead.id);
  return "inserted";
}

function findLeadRow(sheet, leadId) {
  const id = String(leadId || "").trim();
  const lastRow = sheet.getLastRow();

  if (!id || lastRow < 2) return 0;

  const match = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(id)
    .matchEntireCell(true)
    .findNext();

  return match ? match.getRow() : 0;
}

function saveToBrevo(lead) {
  const properties = PropertiesService.getScriptProperties();
  const apiKey = properties.getProperty("BREVO_API_KEY");
  const listId = Number(properties.getProperty("BREVO_LIST_ID"));

  if (!apiKey) {
    throw new Error("BREVO_API_KEY não configurada nas propriedades do script.");
  }

  if (!Number.isInteger(listId) || listId <= 0) {
    throw new Error("BREVO_LIST_ID não configurado ou inválido.");
  }

  const name = splitName(lead.studentName);
  const payload = {
    email: String(lead.studentEmail).trim().toLowerCase(),
    attributes: {
      FIRSTNAME: name.firstName,
      SMS: formatBrazilPhone(lead.studentWhatsapp)
    },
    listIds: [listId],
    updateEnabled: true
  };

  if (name.lastName) payload.attributes.LASTNAME = name.lastName;

  const response = UrlFetchApp.fetch("https://api.brevo.com/v3/contacts", {
    method: "post",
    contentType: "application/json",
    headers: {
      accept: "application/json",
      "api-key": apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status >= 200 && status < 300) {
    return { ok: true, status: status };
  }

  throw new Error("Brevo respondeu " + status + ": " + body.slice(0, 300));
}

function splitName(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: parts.shift() || "",
    lastName: parts.join(" ")
  };
}

function normalizeBrazilMobileDigits(value) {
  let digits = String(value || "").replace(/\D/g, "");

  // Aceita tanto DDD + número quanto +55 + DDD + número.
  while (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  const validDdds = [
    "11","12","13","14","15","16","17","18","19","21","22","24","27","28",
    "31","32","33","34","35","37","38","41","42","43","44","45","46","47",
    "48","49","51","53","54","55","61","62","63","64","65","66","67","68",
    "69","71","73","74","75","77","79","81","82","83","84","85","86","87",
    "88","89","91","92","93","94","95","96","97","98","99"
  ];

  if (
    digits.length !== 11 ||
    validDdds.indexOf(digits.slice(0, 2)) === -1 ||
    digits.charAt(2) !== "9" ||
    /^(\d)\1{10}$/.test(digits)
  ) {
    throw new Error("WhatsApp inválido. Informe DDD + celular, sem o 55.");
  }

  return digits;
}

function formatBrazilPhoneNational(value) {
  const digits = normalizeBrazilMobileDigits(value);
  return (
    "(" +
    digits.slice(0, 2) +
    ") " +
    digits.slice(2, 7) +
    "-" +
    digits.slice(7)
  );
}

function formatBrazilPhone(value) {
  return "+55" + normalizeBrazilMobileDigits(value);
}

function validateLead(lead) {
  const required = ["id", "studentName", "studentWhatsapp", "studentEmail"];
  const missing = required.filter(function (field) {
    return !String(lead[field] || "").trim();
  });

  if (missing.length) {
    throw new Error("Campos ausentes: " + missing.join(", "));
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(lead.studentEmail).trim())) {
    throw new Error("E-mail inválido.");
  }
}

// Impede que textos iniciados por =, +, - ou @ virem fórmulas na planilha.
function safeCell(value) {
  const text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * Execute manualmente uma vez para preparar o monitoramento da campanha.
 *
 * Cria:
 * - "Meta Ads": uma linha por dia com métricas importadas do Meta.
 * - "Painel Meta": resumo automático de investimento, leads e conversão.
 *
 * Esta função não apaga nem modifica a aba "Leads".
 */
function setupMetaAdsSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dataSheet = getOrCreateSheet(spreadsheet, "Meta Ads", 1000, 19);
  const dashboardSheet = getOrCreateSheet(spreadsheet, "Painel Meta", 30, 8);

  setupMetaAdsDataSheet(dataSheet);
  setupMetaAdsDashboard(dashboardSheet);

  spreadsheet.setActiveSheet(dashboardSheet);
  console.log("Abas Meta Ads e Painel Meta preparadas com sucesso.");
}

function setupMetaAdsDataSheet(sheet) {
  const headers = [
    "Data",
    "ID da campanha",
    "Campanha",
    "Investimento",
    "Impressões",
    "Alcance",
    "Frequência",
    "Cliques no link",
    "Visualizações da página",
    "Leads no Meta",
    "Leads na planilha",
    "CPL no Meta",
    "CPL real",
    "CTR do link",
    "CPC do link",
    "Conversão página → lead",
    "Diferença de leads",
    "Status",
    "Observações"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet
    .getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#e8eaed")
    .setFontColor("#202124")
    .setHorizontalAlignment("center")
    .setWrap(true);
  sheet.setFrozenRows(1);

  if (!sheet.getFilter()) {
    sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).createFilter();
  }

  const formulas = [];
  for (let row = 2; row <= 1000; row++) {
    formulas.push([
      '=IF(A' + row + '="";"";COUNTIFS(Leads!$B:$B;">="&A' + row + ';Leads!$B:$B;"<"&A' + row + '+1))',
      '=IF(A' + row + '="";"";IFERROR(D' + row + '/J' + row + ';0))',
      '=IF(A' + row + '="";"";IFERROR(D' + row + '/K' + row + ';0))',
      '=IF(A' + row + '="";"";IFERROR(H' + row + '/E' + row + ';0))',
      '=IF(A' + row + '="";"";IFERROR(D' + row + '/H' + row + ';0))',
      '=IF(A' + row + '="";"";IFERROR(K' + row + '/I' + row + ';0))',
      '=IF(A' + row + '="";"";K' + row + '-J' + row + ')',
      '=IF(A' + row + '="";"";IF(ABS(Q' + row + ')>1;"Conferir";IF(P' + row + '<5%;"Atenção";"OK")))'
    ]);
  }

  // K:R são calculadas automaticamente; A:J e S receberão os dados da API.
  sheet.getRange(2, 11, formulas.length, 8).setFormulas(formulas);

  sheet.getRange("A2:A1000").setNumberFormat("dd/mm/yyyy");
  sheet.getRange("D2:D1000").setNumberFormat('R$ #,##0.00');
  sheet.getRange("L2:M1000").setNumberFormat('R$ #,##0.00');
  sheet.getRange("N2:N1000").setNumberFormat("0.00%");
  sheet.getRange("O2:O1000").setNumberFormat('R$ #,##0.00');
  sheet.getRange("P2:P1000").setNumberFormat("0.00%");
  sheet.getRange("E2:K1000").setNumberFormat("#,##0");
  sheet.getRange("G2:G1000").setNumberFormat("0.00");

  const widths = [
    95, 145, 240, 110, 105, 95, 90, 110, 145, 105,
    120, 105, 105, 100, 100, 150, 125, 100, 260
  ];
  widths.forEach(function (width, index) {
    sheet.setColumnWidth(index + 1, width);
  });

  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("OK")
      .setBackground("#d9ead3")
      .setFontColor("#274e13")
      .setRanges([sheet.getRange("R2:R1000")])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Atenção")
      .setBackground("#fff2cc")
      .setFontColor("#7f6000")
      .setRanges([sheet.getRange("R2:R1000")])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Conferir")
      .setBackground("#f4cccc")
      .setFontColor("#990000")
      .setRanges([sheet.getRange("R2:R1000")])
      .build()
  ]);
}

function setupMetaAdsDashboard(sheet) {
  sheet.getRange("A1:H12").clearContent().clearFormat();

  sheet.getRange("A1:H1").merge();
  sheet
    .getRange("A1")
    .setValue("PAINEL DA CAMPANHA — QUIZ DE PERFIL")
    .setFontSize(16)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground("#e8eaed")
    .setFontColor("#202124");

  const labels = [
    ["A3", "Investimento total"],
    ["C3", "Leads no Meta"],
    ["E3", "Leads na planilha"],
    ["G3", "CPL real"],
    ["A6", "Impressões"],
    ["C6", "Cliques no link"],
    ["E6", "Visualizações da página"],
    ["G6", "Conversão página → lead"],
    ["A9", "Diferença de leads"],
    ["C9", "CTR do link"],
    ["E9", "CPC do link"],
    ["G9", "Última atualização"]
  ];

  labels.forEach(function (item) {
    sheet
      .getRange(item[0])
      .setValue(item[1])
      .setFontWeight("bold")
      .setFontColor("#5f6368");
  });

  sheet.getRange("A4").setFormula("=SUM('Meta Ads'!D2:D)");
  sheet.getRange("C4").setFormula("=SUM('Meta Ads'!J2:J)");
  sheet.getRange("E4").setFormula("=SUM('Meta Ads'!K2:K)");
  sheet.getRange("G4").setFormula("=IFERROR(A4/E4;0)");
  sheet.getRange("A7").setFormula("=SUM('Meta Ads'!E2:E)");
  sheet.getRange("C7").setFormula("=SUM('Meta Ads'!H2:H)");
  sheet.getRange("E7").setFormula("=SUM('Meta Ads'!I2:I)");
  sheet.getRange("G7").setFormula("=IFERROR(E4/E7;0)");
  sheet.getRange("A10").setFormula("=E4-C4");
  sheet.getRange("C10").setFormula("=IFERROR(C7/A7;0)");
  sheet.getRange("E10").setFormula("=IFERROR(A4/C7;0)");
  sheet
    .getRange("G10")
    .setFormula('=IFERROR(MAX(FILTER(\'Meta Ads\'!A2:A;\'Meta Ads\'!A2:A<>""));"Aguardando dados")');

  sheet.getRange("A4").setNumberFormat('R$ #,##0.00');
  sheet.getRange("G4").setNumberFormat('R$ #,##0.00');
  sheet.getRange("G7").setNumberFormat("0.00%");
  sheet.getRange("C10").setNumberFormat("0.00%");
  sheet.getRange("E10").setNumberFormat('R$ #,##0.00');
  sheet.getRange("G10").setNumberFormat("dd/mm/yyyy");

  ["A4", "C4", "E4", "G4", "A7", "C7", "E7", "G7", "A10", "C10", "E10", "G10"]
    .forEach(function (cell) {
      sheet
        .getRange(cell)
        .setFontSize(15)
        .setFontWeight("bold")
        .setBackground("#f8f9fa")
        .setBorder(true, true, true, true, false, false, "#dadce0", SpreadsheetApp.BorderStyle.SOLID);
    });

  for (let column = 1; column <= 8; column++) {
    sheet.setColumnWidth(column, column % 2 === 1 ? 150 : 25);
  }
  sheet.setFrozenRows(1);

  sheet
    .getRange("A12:H12")
    .merge()
    .setValue("A aba será preenchida automaticamente após conectarmos a API do Meta Ads.")
    .setFontColor("#5f6368")
    .setFontStyle("italic")
    .setHorizontalAlignment("center");
}

function getOrCreateSheet(spreadsheet, name, minRows, minColumns) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);

  if (sheet.getMaxRows() < minRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), minRows - sheet.getMaxRows());
  }
  if (sheet.getMaxColumns() < minColumns) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      minColumns - sheet.getMaxColumns()
    );
  }

  return sheet;
}

/**
 * Valida o token e mostra no histórico de execução qual conta foi conectada.
 *
 * Propriedades obrigatórias do script:
 * - META_ACCESS_TOKEN
 * - META_AD_ACCOUNT_ID
 *
 * Propriedades opcionais:
 * - META_CAMPAIGN_ID: limita o relatório à campanha do quiz.
 * - META_API_VERSION: usa v25.0 quando não for informada.
 */
function authorizeMetaAds() {
  const config = getMetaAdsConfig();
  const endpoint =
    "https://graph.facebook.com/" +
    config.apiVersion +
    "/act_" +
    config.adAccountId +
    "?fields=id,name,account_status,currency,timezone_name";
  const account = fetchMetaJson(endpoint, config.accessToken);

  console.log(
    "Meta Ads autorizado: " +
      account.name +
      " (" +
      account.id +
      "), moeda " +
      account.currency +
      ", fuso " +
      account.timezone_name
  );

  return account;
}

/**
 * Busca os últimos 30 dias da campanha no Meta e atualiza a aba "Meta Ads".
 * Registros existentes são atualizados pela combinação Data + ID da campanha.
 */
function syncMetaAdsInsights() {
  const config = getMetaAdsConfig();
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("Meta Ads");

  if (!sheet) {
    throw new Error(
      'A aba "Meta Ads" não existe. Execute setupMetaAdsSheet primeiro.'
    );
  }

  const timezone = spreadsheet.getSpreadsheetTimeZone() || "America/Sao_Paulo";
  const endDate = Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd");
  const startDate = Utilities.formatDate(
    new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    timezone,
    "yyyy-MM-dd"
  );
  const fields = [
    "date_start",
    "date_stop",
    "campaign_id",
    "campaign_name",
    "spend",
    "impressions",
    "reach",
    "frequency",
    "inline_link_clicks",
    "actions"
  ].join(",");

  const params = {
    fields: fields,
    level: "campaign",
    time_increment: "1",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    limit: "500"
  };

  if (config.campaignId) {
    params.filtering = JSON.stringify([
      {
        field: "campaign.id",
        operator: "IN",
        value: [config.campaignId]
      }
    ]);
  }

  const query = Object.keys(params)
    .map(function (key) {
      return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
    })
    .join("&");
  let nextUrl =
    "https://graph.facebook.com/" +
    config.apiVersion +
    "/act_" +
    config.adAccountId +
    "/insights?" +
    query;
  let insights = [];
  let pageCount = 0;

  while (nextUrl && pageCount < 20) {
    const response = fetchMetaJson(nextUrl, config.accessToken);
    insights = insights.concat(response.data || []);
    nextUrl =
      response.paging && response.paging.next ? response.paging.next : "";
    pageCount++;
  }

  const existingKeys = {};
  const dateAndCampaign = sheet
    .getRange(2, 1, sheet.getMaxRows() - 1, 2)
    .getValues();

  dateAndCampaign.forEach(function (row, index) {
    if (!row[0] || !row[1]) return;
    existingKeys[normalizeSheetDateKey(row[0], timezone) + "|" + String(row[1])] =
      index + 2;
  });

  const availableRows = [];
  dateAndCampaign.forEach(function (row, index) {
    if (!row[0]) availableRows.push(index + 2);
  });

  let inserted = 0;
  let updated = 0;

  insights.forEach(function (insight) {
    const key = insight.date_start + "|" + insight.campaign_id;
    let targetRow = existingKeys[key];

    if (!targetRow) {
      targetRow = availableRows.shift();
      if (!targetRow) {
        sheet.insertRowsAfter(sheet.getMaxRows(), 100);
        targetRow = sheet.getMaxRows() - 99;
        copyMetaAdsFormulas(sheet, targetRow, targetRow + 99);
        for (let row = targetRow + 1; row <= targetRow + 99; row++) {
          availableRows.push(row);
        }
      }
      existingKeys[key] = targetRow;
      inserted++;
    } else {
      updated++;
    }

    const rowValues = [
      parseMetaDate(insight.date_start),
      safeCell(insight.campaign_id),
      safeCell(insight.campaign_name),
      toNumber(insight.spend),
      toNumber(insight.impressions),
      toNumber(insight.reach),
      toNumber(insight.frequency),
      toNumber(insight.inline_link_clicks),
      getMetaActionValue(insight.actions, ["landing_page_view"]),
      getMetaActionValue(insight.actions, [
        "offsite_conversion.fb_pixel_lead",
        "lead",
        "onsite_conversion.lead_grouped"
      ])
    ];

    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  });

  sheet.getRange("A2:A" + sheet.getMaxRows()).setNumberFormat("dd/mm/yyyy");
  console.log(
    "Meta Ads sincronizado: " +
      insights.length +
      " registro(s), " +
      inserted +
      " inserido(s), " +
      updated +
      " atualizado(s)."
  );

  return {
    ok: true,
    startDate: startDate,
    endDate: endDate,
    records: insights.length,
    inserted: inserted,
    updated: updated
  };
}

/**
 * Cria uma execução automática a cada 6 horas.
 * Isso reduz o risco de perder o dia quando a Meta ainda não consolidou os
 * dados no início da manhã. Remove gatilhos antigos para evitar duplicidade.
 */
function createMetaAdsDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function (trigger) {
      return trigger.getHandlerFunction() === "syncMetaAdsInsights";
    })
    .forEach(function (trigger) {
      ScriptApp.deleteTrigger(trigger);
    });

  ScriptApp.newTrigger("syncMetaAdsInsights")
    .timeBased()
    .everyHours(6)
    .create();

  console.log("Atualização automática do Meta Ads configurada a cada 6 horas.");
}

function getMetaAdsConfig() {
  const properties = PropertiesService.getScriptProperties();
  const accessToken = properties.getProperty("META_ACCESS_TOKEN");
  const rawAccountId = properties.getProperty("META_AD_ACCOUNT_ID");
  const campaignId = properties.getProperty("META_CAMPAIGN_ID") || "";
  const apiVersion =
    properties.getProperty("META_API_VERSION") || "v25.0";
  const adAccountId = String(rawAccountId || "")
    .trim()
    .replace(/^act_/, "");

  const missing = [];
  if (!accessToken) missing.push("META_ACCESS_TOKEN");
  if (!adAccountId) missing.push("META_AD_ACCOUNT_ID");

  if (missing.length) {
    throw new Error(
      "Propriedades do Meta ausentes: " +
        missing.join(", ") +
        ". Configure em Configurações do projeto > Propriedades do script."
    );
  }

  return {
    accessToken: accessToken,
    adAccountId: adAccountId,
    campaignId: String(campaignId).trim(),
    apiVersion: String(apiVersion).trim()
  };
}

function fetchMetaJson(url, accessToken) {
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      Authorization: "Bearer " + accessToken
    },
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  const body = response.getContentText();
  let data;

  try {
    data = JSON.parse(body);
  } catch (error) {
    throw new Error("Resposta inválida do Meta Ads: " + body.slice(0, 300));
  }

  if (status < 200 || status >= 300 || data.error) {
    const message =
      data.error && data.error.message ? data.error.message : body.slice(0, 300);
    throw new Error("Meta Ads respondeu " + status + ": " + message);
  }

  return data;
}

function getMetaActionValue(actions, preferredTypes) {
  const actionList = actions || [];

  for (let index = 0; index < preferredTypes.length; index++) {
    const preferred = preferredTypes[index];
    const match = actionList.find(function (action) {
      return action.action_type === preferred;
    });
    if (match) return toNumber(match.value);
  }

  return 0;
}

function normalizeSheetDateKey(value, timezone) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, timezone, "yyyy-MM-dd");
  }

  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? match[3] + "-" + match[2] + "-" + match[1] : String(value);
}

function parseMetaDate(value) {
  const parts = String(value).split("-");
  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]),
    12,
    0,
    0
  );
}

function toNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function copyMetaAdsFormulas(sheet, startRow, endRow) {
  const formulas = [];

  for (let row = startRow; row <= endRow; row++) {
    formulas.push([
      '=IF(A' + row + '="","",COUNTIFS(Leads!$B:$B,">="&A' + row + ',Leads!$B:$B,"<"&A' + row + '+1))',
      '=IF(A' + row + '="","",IFERROR(D' + row + '/J' + row + ',0))',
      '=IF(A' + row + '="","",IFERROR(D' + row + '/K' + row + ',0))',
      '=IF(A' + row + '="","",IFERROR(H' + row + '/E' + row + ',0))',
      '=IF(A' + row + '="","",IFERROR(D' + row + '/H' + row + ',0))',
      '=IF(A' + row + '="","",IFERROR(K' + row + '/I' + row + ',0))',
      '=IF(A' + row + '="","",K' + row + '-J' + row + ')',
      '=IF(A' + row + '="","",IF(ABS(Q' + row + ')>1,"Conferir",IF(P' + row + '<0.05,"Atenção","OK")))'
    ]);
  }

  sheet
    .getRange(startRow, 11, formulas.length, formulas[0].length)
    .setFormulas(formulas);
}
