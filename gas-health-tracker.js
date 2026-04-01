// ============================================
// 体質改善ログ — Google Apps Script (GAS)
// ============================================
// このスクリプトをGoogle Sheetsに紐づけたGASプロジェクトに貼り付けてください。
//
// 【セットアップ手順】
// 1. Google Sheetsで新しいスプレッドシートを作成
// 2. 「拡張機能」→「Apps Script」を開く
// 3. このコード全体をコピーしてCode.gsに貼り付け
// 4. 「デプロイ」→「新しいデプロイ」
//    - 種類：「ウェブアプリ」
//    - 実行するユーザー：「自分」
//    - アクセスできるユーザー：「全員」
// 5. デプロイして表示されるURLをコピー
// 6. そのURLをアプリの設定画面に貼り付ける
// ============================================

// POSTリクエストを受け取るエンドポイント
function doPost(e) {
  try {
    // フォーム送信（e.parameter.data）とJSON POST（e.postData.contents）の両方に対応
    const raw = (e.parameter && e.parameter.data) ? e.parameter.data : e.postData.contents;
    const data = JSON.parse(raw);
    const userName = data.name || "未設定";
    const records = data.records || [];

    if (records.length === 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, message: "No records to process" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // --- マスターシートに書き込み ---
    let masterSheet = ss.getSheetByName("全記録");
    if (!masterSheet) {
      masterSheet = ss.insertSheet("全記録");
      masterSheet.appendRow([
        "記録ID", "日付", "時刻", "名前", "種類", "詳細", "送信日時"
      ]);
      // ヘッダー行を太字に
      masterSheet.getRange(1, 1, 1, 7).setFontWeight("bold");
      masterSheet.setFrozenRows(1);
    }

    // --- 人別シートの準備 ---
    let userSheet = ss.getSheetByName(userName);
    if (!userSheet) {
      userSheet = ss.insertSheet(userName);
      userSheet.appendRow([
        "記録ID", "日付", "時刻", "種類", "詳細", "送信日時"
      ]);
      userSheet.getRange(1, 1, 1, 6).setFontWeight("bold");
      userSheet.setFrozenRows(1);
    }

    // --- 既存の記録IDを取得（重複防止） ---
    const existingIds = new Set();
    const masterData = masterSheet.getDataRange().getValues();
    for (let i = 1; i < masterData.length; i++) {
      existingIds.add(String(masterData[i][0]));
    }

    // --- レコードを書き込み ---
    const now = new Date().toLocaleString("ja-JP");
    let addedCount = 0;

    for (const r of records) {
      const recordId = String(r.id);

      // 重複チェック
      if (existingIds.has(recordId)) continue;

      const detail = getDetailString(r);

      // マスターシートに追加
      masterSheet.appendRow([
        recordId, r.date, r.time, userName, getTypeLabel(r.type), detail, now
      ]);

      // 人別シートに追加
      userSheet.appendRow([
        recordId, r.date, r.time, getTypeLabel(r.type), detail, now
      ]);

      addedCount++;
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        added: addedCount,
        total: records.length
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// CORSプリフライト対応
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Health Tracker GAS endpoint" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- ヘルパー関数 ---

function getTypeLabel(type) {
  const labels = {
    bowel: "排便",
    urination: "排尿",
    meal: "食事",
    drink: "飲み物",
    weight: "体重",
    sleep: "睡眠",
    exercise: "運動",
    diary: "気づき",
  };
  return labels[type] || type;
}

function getDetailString(r) {
  switch (r.type) {
    case "bowel": {
      const amountLabels = { small: "少なめ", normal: "普通", large: "多め" };
      let s = r.bristol ? "ブリストル" + r.bristol : "";
      if (r.bowelAmount) s += (s ? " " : "") + (amountLabels[r.bowelAmount] || r.bowelAmount);
      return s || "記録済み";
    }
    case "urination":
      return r.colorId ? "色:" + r.colorId : "記録済み";
    case "meal":
      return (r.mealType || "") + ": " + (r.content || "");
    case "drink": {
      const cats = { water: "水", hakuyu: "白湯", tea: "お茶", coffee: "コーヒー", protein: "プロテイン", premium_morning: "朝食時商材", premium_lunch: "昼食時商材", premium_dinner: "夕食時商材", premium_bedtime: "就寝前商材", essential_green: "エッセンシャルG", juice: "ジュース", alcohol: "アルコール", other: "その他" };
      return (cats[r.category] || r.category || "") + " " + (r.amount || "") + "ml";
    }
    case "weight":
      return "体重" + (r.kg || "") + "kg 体脂肪" + (r.fat || "") + "%";
    case "sleep":
      return "就寝" + (r.bed || "") + " 起床" + (r.wake || "");
    case "exercise": {
      const types = { walk: "ウォーキング", run: "ランニング", gym: "筋トレ", other: "その他" };
      const intensityLabels = { light: "軽め", moderate: "普通", hard: "きつめ" };
      let s = types[r.exerciseType] || r.exerciseType || "";
      if (r.intensity) s += " [" + (intensityLabels[r.intensity] || r.intensity) + "]";
      if (r.minutes) s += " " + r.minutes + "分";
      if (r.steps) s += " " + r.steps + "歩";
      if (r.note) s += " / " + r.note;
      return s;
    }
    case "diary":
      return r.content || "";
    default:
      return JSON.stringify(r);
  }
}
