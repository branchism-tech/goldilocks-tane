// ====== 共通：ログイン＆スコープ確認 ======
async function ensureLoginAndScopes() {
  // 1) 未ログインならログイン
  if (!liff.isLoggedIn()) {
    await liff.login({ scope: ["profile", "openid"], prompt: "consent" });
    return false; // リダイレクトするのでここで終了
  }

  // 2) idToken が無ければ再同意（OpenID）
  const idToken = liff.getIDToken();
  if (!idToken) {
    await liff.login({ scope: ["profile", "openid"], prompt: "consent" });
    return false;
  }

  // 3) profile スコープ確認（getProfile が成功すればOK）
  try {
    await liff.getProfile();
  } catch {
    await liff.login({ scope: ["profile", "openid"], prompt: "consent" });
    return false;
  }
  return true;
}

function toast(msg) {
  $("#errText").text(msg);
  $("#errToast").fadeIn(150);
  setTimeout(() => $("#errToast").fadeOut(300), 2200);
}

const loading = {
  on: () => $("#loadingOverlay").show(),
  off: () => $("#loadingOverlay").hide(),
};

function formatNow() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}/${MM}/${dd} ${HH}:${mm}:${ss}`;
}
