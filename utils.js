// ====== 共通：ログイン＆スコープ確認 ======
async function ensureLoginAndScopes() {
  if (!liff.isLoggedIn()) {
    await liff.login({ scope: ["profile", "openid"], prompt: "consent" });
    return false;
  }
  const idToken = liff.getIDToken();
  if (!idToken) {
    await liff.login({ scope: ["profile", "openid"], prompt: "consent" });
    return false;
  }
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

// DOM生成待ち（存在チェックをポーリング）
async function waiteCreateDom(ids, timeoutMs = 4000, intervalMs = 50) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const allExist = (ids || []).every((id) => document.getElementById(id));
    if (allExist) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

// プロフィール詳細をスクリーン2に描画
function fillProfileDetail(profile) {
  // 画像
  const icon = document.getElementById("profile-owner-icon");
  if (icon) icon.src = profile.ownerIcon || "smile.png";

  // テキスト
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "…";
  };
  $("#profile-userId").val(profile.userId);
  setText("profile-name", profile.name);
  setText("profile-favorite", profile.favorite);
  setText("profile-hobby", profile.hobby);
  setText("profile-age", profile.age);
  setText("profile-sex", profile.sex);
  setText("profile-address", profile.address);
  if (!profile.likeUserFlg) {
    const btn = document.getElementById("profile-like-btn");
    btn.disabled = false;
    btn.classList.remove("btn-secondary", "btn-liked");
    btn.classList.add("btn-primary");
    btn.classList.add("like-btn");
  } else {
    setProfileLiked();
  }
}

// 画面切り替え
function showProfileScreen() {
  const s1 = document.getElementById("screen1");
  const s2 = document.getElementById("screen2");
  if (s1) s1.style.display = "none";
  if (s2) s2.style.display = "block";
}

function hideProfileScreen() {
  const s1 = document.getElementById("screen1");
  const s2 = document.getElementById("screen2");
  if (s1) s1.style.display = "block";
  if (s2) s2.style.display = "none";
}

// profiles: 直近の likes の配列（renderLikesとセットで呼ぶ想定）
// idBase: "likesAvatar" を想定
// likeBtnRowShowFlg / rtnBtnRowShowFlg: 詳細での表示制御
function addListenerProfileDetail(
  profiles,
  idBase,
  likeBtnRowShowFlg,
  rtnBtnRowShowFlg
) {
  // ここでは profiles は使用せず、likesProfileMap を参照（再描画でもバインドは1回でOK）
  const $wrap = $("#likesAvatars");

  // 名前空間付きで付け直し（多重バインド防止）
  $wrap
    .off("click.likesNs")
    .on("click.likesNs", `img[id^="${idBase}_"]`, function (ev) {
      ev.preventDefault();
      const prof = likesProfileMap[this.id] || {};
      fillProfileDetail(prof);
      if (likeBtnRowShowFlg) $("#profile-like-btn-row").show();
      else $("#profile-like-btn-row").hide();
      if (rtnBtnRowShowFlg) $("#profile-rtn-btn-row").show();
      else $("#profile-rtn-btn-row").hide();
      showProfileScreen();
    });
}

// 単一要素（ownerIcon）
function addListenerProfileDetailSingle(
  elemId,
  profile,
  likeBtnRowShowFlg,
  rtnBtnRowShowFlg
) {
  const $el = $(`#${elemId}`);
  if ($el.length === 0) return;

  // 多重バインド防止（名前空間）

  $el.off("click.ownerNs").on("click.ownerNs", function (ev) {
    ev.preventDefault();
    fillProfileDetail(profile);
    if (likeBtnRowShowFlg) $("#profile-like-btn-row").show();
    else $("#profile-like-btn-row").hide();
    if (rtnBtnRowShowFlg) $("#profile-rtn-btn-row").show();
    else $("#profile-rtn-btn-row").hide();
    showProfileScreen();
  });
}

async function profileLikeActionForTaneDsp() {
  const $btn = $("#profile-like-btn");
  if ($btn.hasClass("btn-liked") || $btn.prop("disabled")) return;

  try {
    loading.on();
    const userId = $("#profile-userId").val();
    const idt = liff.getIDToken();
    const r = await fetch(
      `${GAS_ENDPOINT}?action=like_user&taneId=${encodeURIComponent(
        taneId
      )}&userId=${encodeURIComponent(userId)}&
      )}&id_token=${encodeURIComponent(idt)}`
    );
    const j = r.ok ? await r.json() : { ok: false };
    if (!j.ok) {
      toast(j.error || "いいねに失敗しました");
      return;
    }
    renderLikes(j.likes || []);
    setProfileLiked();

    // クリックでプロフィール詳細（owner単体）
    addListenerProfileDetailSingle(
      "ownerIcon",
      j.ownerProfile || {},
      true,
      true
    );

    // 再バインド（再描画後）
    const likeProfiles = (j.likes || []).map((x) => x.likeProfile || {});
    addListenerProfileDetail(likeProfiles, "likesAvatar", true, true);
  } catch (e) {
    console.error(e);
    toast("いいね処理でエラー");
  } finally {
    loading.off();
  }
}

function setProfileLiked() {
  const btn = document.getElementById("profile-like-btn");
  btn.textContent = "いいね済み";
  btn.disabled = true;
  btn.classList.remove("btn-primary");
  btn.classList.add("btn-secondary", "btn-liked");
}

function addListenerProfileDetailRtnBtn() {
  document.getElementById("profile-rtn-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    hideProfileScreen();
  });
}

// profileDspCommHtml.htmlの表示用エレメントID一覧
const PROFILE_DSP_COMM_HTML_DSP_IDS = [
  "profile-owner-icon",
  "profile-name",
  "profile-favorite",
  "profile-hobby",
  "profile-age",
  "profile-sex",
  "profile-address",
  "profile-like-btn-row",
  "profile-rtn-btn-row",
];
