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
  on: () => $("#loadingOverlay").addClass("show"),
  off: () => $("#loadingOverlay").removeClass("show"),
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
function fillProfileDetail(kbn, profile) {
  // 画像
  const icon = document.getElementById("profile-owner-icon");
  if (icon) icon.src = profile.ownerIcon || "logo.png";

  // テキスト
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "…";
  };
  $("#profile-userId").val(profile.userId);
  setText("profile-name", profile.name);
  setText("profile-job", profile.job);
  setText("profile-hobby", profile.hobby);
  setText("profile-age", profile.age);
  setText("profile-sex", profile.sex);
  setText("profile-address", profile.address);
  renderTaneList("profile-tane-list", profile.taneList || []);
  renderTaneList("profile-tane-like-list", profile.taneLikeList || []);

  // いいねはなしに
  // if (kbn === "tane") {
  //   if (!profile.likeUserFlg) {
  //     const btn = document.getElementById("profile-like-btn");
  //     btn.textContent = "いいね！";
  //     btn.disabled = false;
  //     btn.classList.remove("btn-secondary", "btn-liked");
  //     btn.classList.add("btn-primary", "like-btn");
  //   } else {
  //     setProfileLiked();
  //   }
  // }
}

// タネリスト描画用の共通関数
function renderTaneList(containerId, list) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  wrap.innerHTML = "";

  list.forEach((d) => {
    const card = $(`
    <div class="col-md-6 col-12">
      <div class="card card-tane" data-id="${d.taneId}" style="cursor: pointer;" onclick="window.location.href='taneDsp.html?taneId=${encodeURIComponent(d.taneId)}'">
        <div class="card-body">
          <p class="text-xsmall">${d.category || ""}</p>
          <h6>${d.title || ""}</h6>
          <p class="small">${d.comment || ""}</p>
        </div>
      </div>
    </div>
  `);
    
    $(wrap).append(card);
  });
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
      fillProfileDetail("tane", prof);
      // if (likeBtnRowShowFlg) $("#profile-like-btn-row").show();
      // else {
        // $("#profile-like-btn-row").hide();
        // いいねをなしに
        // document.getElementById("profile-like-btn-row").style.display = "none";
      // }
      if (rtnBtnRowShowFlg) $("#profile-rtn-btn-row").show();
      else {
        $("#profile-rtn-btn-row").hide();
        document.getElementById("profile-rtn-btn-row").style.display = "none";
      }
      sendViewUserLog(prof.userId, "taneDsp");
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
    fillProfileDetail("tane", profile);
    // if (likeBtnRowShowFlg) $("#profile-like-btn-row").show();
    // else {
      // $("#profile-like-btn-row").hide();
      // document.getElementById("profile-like-btn-row").style.display = "none";
    // }
    if (rtnBtnRowShowFlg) $("#profile-rtn-btn-row").show();
    else {
      $("#profile-rtn-btn-row").hide();
      document.getElementById("profile-rtn-btn-row").style.display = "none";
    }

    sendViewUserLog(profile.userId, "taneDsp");
    showProfileScreen();
  });
}

function profileLikeActionForTaneDsp() {
  const $btn = $("#profile-like-btn");
  if ($btn.hasClass("btn-liked") || $btn.prop("disabled")) return;
  const userId = $("#profile-userId").val();
  // ---- 元の状態を保存（ロールバック用）----
  const prevOwnerProfile = { ...rtnData.ownerProfile };
  const prevLikes = JSON.parse(JSON.stringify(rtnData.likes || []));

  // ---- 楽観的にUI更新 ----
  if (prevOwnerProfile.userId === userId) {
    rtnData.ownerProfile.likeUserFlg = true;
    addListenerProfileDetailSingle(
      "ownerIcon",
      rtnData.ownerProfile || {},
      true,
      true
    );
  }
  (rtnData.likes || []).some((like) => {
    if (like.likeProfile && like.likeProfile.userId === userId) {
      like.likeProfile.likeUserFlg = true;
      return true;
    }
    return false;
  });
  setProfileLiked();
  renderLikes(rtnData.likes || []);
  const likeProfiles = (rtnData.likes || []).map((x) => x.likeProfile || {});
  addListenerProfileDetail(likeProfiles, "likesAvatar", true, true);

  // ---- 非同期でサーバーへ投げっぱなし ----
  const idt = liff.getIDToken();
  const url = `${GAS_ENDPOINT}?action=like_user&userId=${encodeURIComponent(
    userId
  )}&id_token=${encodeURIComponent(idt)}`;

  fetch(url)
    .then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
    )
    .then((j) => {
      if (!j.ok) throw new Error(j.error || "like failed");
      // 成功なら何もしない（すでにUI更新済み）
    })
    .catch((err) => {
      console.error(err);
      toast("いいねに失敗しました");

      // ---- ロールバック ----
      rtnData.ownerProfile = prevOwnerProfile;
      rtnData.likes = prevLikes;
      renderLikes(rtnData.likes || []);
      if (prevOwnerProfile.userId === userId) {
        addListenerProfileDetailSingle(
          "ownerIcon",
          rtnData.ownerProfile || {},
          true,
          true
        );
      }
      const likeProfiles2 = (rtnData.likes || []).map(
        (x) => x.likeProfile || {}
      );
      addListenerProfileDetail(likeProfiles2, "likesAvatar", true, true);

      // ボタン表示も元へ
      const btn = document.getElementById("profile-like-btn");
      btn.textContent = "いいね！";
      btn.disabled = false;
      btn.classList.remove("btn-secondary", "btn-liked");
      btn.classList.add("btn-primary", "like-btn");
    });
}

function profileLikeActionForProfileDsp() {
  const $btn = $("#profile-like-btn");
  const userId = $("#profile-userId").val();
  // ---- 元の状態を保存（ロールバック用）----
  const prevProfile = { ...rtnData.profile };

  // ---- 楽観的にUI更新 ----
  rtnData.profile.likeUserFlg = true;
  setProfileLiked();

  // ---- 非同期でサーバーへ投げっぱなし ----
  const idt = liff.getIDToken();
  const url = `${GAS_ENDPOINT}?action=like_user&userId=${encodeURIComponent(
    userId
  )}&id_token=${encodeURIComponent(idt)}`;

  fetch(url)
    .then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
    )
    .then((j) => {
      if (!j.ok) throw new Error(j.error || "like failed");
      // 成功なら何もしない（すでにUI更新済み）
    })
    .catch((err) => {
      console.error(err);
      toast("いいねに失敗しました");

      // ---- ロールバック ----
      rtnData.profile = prevProfile;
      // ボタン表示も元へ
      const btn = document.getElementById("profile-like-btn");
      btn.textContent = "いいね！";
      btn.disabled = false;
      btn.classList.remove("btn-secondary", "btn-liked");
      btn.classList.add("btn-primary", "like-btn");
    });
}

function setProfileLiked() {
  // いいねをなしに
  // const btn = document.getElementById("profile-like-btn");
  // btn.textContent = "いいね済み";
  // btn.disabled = true;
  // btn.classList.remove("btn-primary");
  // btn.classList.add("btn-secondary", "btn-liked");
}

function addListenerProfileDetailRtnBtn() {
  document.getElementById("profile-rtn-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    hideProfileScreen();
  });
}

function sendViewUserLog(userId, kbn) {
  // ---- 非同期でサーバーへ投げっぱなし ----
  const idt = liff.getIDToken();
  const url = `${GAS_ENDPOINT}?action=view_user&userId=${encodeURIComponent(
    userId
  )}&kbn=${encodeURIComponent(kbn)}&id_token=${encodeURIComponent(idt)}`;

  fetch(url)
    .then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
    )
    .then((j) => {
      if (!j.ok) throw new Error(j.error || "view_user failed");
      // 成功なら何もしない
    })
    .catch((err) => {
      // 失敗しても何もしな
    });
}

// profileDspCommHtml.htmlの表示用エレメントID一覧
const PROFILE_DSP_COMM_HTML_DSP_IDS = [
  "profile-owner-icon",
  "profile-name",
  "profile-job",
  "profile-hobby",
  "profile-age",
  "profile-sex",
  "profile-address",
  // "profile-like-btn-row",
  "profile-rtn-btn-row",
  "tab-posts",
  "tab-likes",
];

// profileDspCommHtml.htmlのscript
function addEventListenerProfileDspTab() {
  // Tab functionality
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-button");
    if (!btn) return; // タブ以外は無視
    const container = btn.closest(".tab-container");
    const buttons = container.querySelectorAll(".tab-button");
    const panels = container.querySelectorAll(".tab-panel");
    const target = container.querySelector(`#tab-${btn.dataset.tab}`);

    buttons.forEach((b) => b.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    if (target) target.classList.add("active");
  });
}
