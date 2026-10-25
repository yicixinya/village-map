// ============================================================
//  乡情数字地图 - 主程序逻辑
//  这个文件一般不需要修改，除非你想调整功能
// ============================================================

let map;
let aiMessages = [];
let currentPointContext = null; // 用户当前点击的点位，AI回答时会参考
let autoSpeak = true; // 是否自动朗读AI回复（默认开启）
const photoBaseUrl = "photos/"; // 照片文件夹路径

// ====== 分类对应的图标 emoji ======
const categoryIcons = {
  "古寺": "⛩",
  "古井": "💧",
  "书室": "📚",
  "炮楼": "🗼",
  "古树": "🌳",
  "宗祠": "🏛",
  "碑刻": "📜",
  "祠堂建筑": "🏛",
  "生活遗存": "💧",
  "古树名木": "🌳",
  "历史建筑": "🏠",
  "交通设施": "🌉",
  "宗教建筑": "⛩",
  "文化设施": "🎭",
  "文献遗存": "📜",
  "防御建筑": "🗼",
  "默认": "📍"
};

// ============================================================
//  初始化
// ============================================================
window.addEventListener("DOMContentLoaded", function () {
  initHeader();
  initMap();
  initAI();
});

// ============================================================
//  顶部信息
// ============================================================
function initHeader() {
  document.getElementById("villageName").textContent = VILLAGE_INFO.villageName + " · 乡情数字地图";
  document.getElementById("villageSubtitle").textContent = VILLAGE_INFO.villageSubtitle;
}

// ============================================================
//  地图初始化
// ============================================================
function initMap() {
  // 创建地图，中心点和缩放级别来自 data.js
  map = L.map("map", {
    zoomControl: true,
    attributionControl: false
  }).setView(MAP_CENTER, MAP_ZOOM);

  // ====== 图层定义 ======
  // 高德卫星实景图（国内分辨率最高，免费无需Key）
  const satelliteLayer = L.tileLayer(
    "https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
    { subdomains: ["1", "2", "3", "4"], maxNativeZoom: 18, maxZoom: 20 }
  );
  // 普通矢量地图（备选，可切换）
  const normalLayer = L.tileLayer(
    "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    { subdomains: ["1", "2", "3", "4"], maxNativeZoom: 18, maxZoom: 20 }
  );

  // 默认只加载卫星实景图
  satelliteLayer.addTo(map);

  // 右上角切换：卫星实景 / 普通地图
  L.control.layers(
    { "🛰 卫星实景": satelliteLayer, "🗺 普通地图": normalLayer },
    null,
    { position: "topright", collapsed: false }
  ).addTo(map);

  // 添加9个点位
  POINTS.forEach(function (point) {
    addPointToMap(point);
  });

  // ====== 辅助功能：点击地图任意位置显示坐标 ======
  // 方便你核对/获取真实经纬度，校准后可删除此段
  map.on("click", function (e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    L.popup()
      .setLatLng(e.latlng)
      .setContent(
        '<div style="font-size:12px;line-height:1.6">' +
        '<b>📍 该点坐标</b><br>' +
        '纬度 lat: <b>' + lat + '</b><br>' +
        '经度 lng: <b>' + lng + '</b><br>' +
        '<span style="color:#888">填入 data.js 时用 [lat, lng] 顺序</span>' +
        '</div>'
      )
      .openOn(map);
  });
}

function addPointToMap(point) {
  // 自定义图标
  const icon = L.divIcon({
    className: "",
    html: '<div class="custom-marker"><span>' + (categoryIcons[point.category] || categoryIcons["默认"]) + '</span></div>',
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44]
  });

  // 弹窗内容（支持多图轮播）
  const imgs = point.images || [];
  const hasImages = imgs.length > 0;
  let galleryHtml;
  if (hasImages) {
    if (imgs.length === 1) {
      galleryHtml = '<img src="' + photoBaseUrl + imgs[0] + '" alt="' + point.name + '" onerror="this.style.display=\'none\'">';
    } else {
      // 多图轮播：显示第一张，左右切换
      const slidesHtml = imgs.map(function (src, i) {
        return '<img src="' + photoBaseUrl + src + '" alt="' + point.name + (i + 1) + '" ' +
               'onerror="this.remove()" style="display:' + (i === 0 ? "block" : "none") + '">';
      }).join("");
      galleryHtml =
        '<div class="popup-gallery" data-idx="0" data-total="' + imgs.length + '">' +
          slidesHtml +
          (imgs.length > 1
            ? '<button class="gal-prev" onclick="gallerySlide(this,-1)">‹</button>' +
              '<button class="gal-next" onclick="gallerySlide(this,1)">›</button>' +
              '<div class="gal-counter">1/' + imgs.length + '</div>'
            : "") +
        '</div>';
    }
  } else {
    galleryHtml = '<div class="popup-img-placeholder">' + (categoryIcons[point.category] || "📍") + '</div>';
  }

  const popupHtml =
    '<div class="popup-card">' +
      galleryHtml +
      '<div class="popup-body">' +
        '<h3>' + point.name + '</h3>' +
        '<span class="category">' + point.category + '</span>' +
        '<p>' + point.intro + '</p>' +
        '<button class="ask-ai-btn" onclick="askAboutPoint(' + point.id + ')">💬 向讲解员提问</button>' +
      '</div>' +
    '</div>';

  const marker = L.marker([point.lat, point.lng], { icon: icon })
    .addTo(map)
    .bindPopup(popupHtml, { maxWidth: 300 });

  marker.pointData = point;
}

// 点击弹窗里的"向讲解员提问"按钮
function askAboutPoint(pointId) {
  const point = POINTS.find(p => p.id === pointId);
  if (!point) return;
  currentPointContext = point;
  openAIPanel();
  // 自动给AI发一条上下文消息
  const autoQuestion = "请介绍一下「" + point.name + "」";
  document.getElementById("aiInput").value = autoQuestion;
  sendQuestion();
}

// 多图轮播切换（btn是弹窗里的箭头按钮）
function gallerySlide(btn, dir) {
  const gallery = btn.closest(".popup-gallery");
  if (!gallery) return;
  const imgs = gallery.querySelectorAll("img");
  const total = imgs.length;
  if (total <= 1) return;
  let idx = parseInt(gallery.getAttribute("data-idx"), 10);
  idx = (idx + dir + total) % total;
  gallery.setAttribute("data-idx", idx);
  imgs.forEach(function (im, i) { im.style.display = (i === idx) ? "block" : "none"; });
  const counter = gallery.querySelector(".gal-counter");
  if (counter) counter.textContent = (idx + 1) + "/" + total;
}

// ============================================================
//  AI 对话
// ============================================================
function initAI() {
  // 预加载语音列表（部分浏览器需要异步加载）
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = function () {
      window.speechSynthesis.getVoices();
    };
  }

  // 在AI面板头部加"自动朗读"开关
  const header = document.querySelector(".ai-header");
  if (header) {
    const toggle = document.createElement("button");
    toggle.className = "autospeak-toggle";
    toggle.textContent = "🔊 自动朗读开";
    toggle.classList.add("on");
    toggle.onclick = function () {
      autoSpeak = !autoSpeak;
      toggle.textContent = autoSpeak ? "🔊 自动朗读开" : "🔇 自动朗读关";
      toggle.classList.toggle("on", autoSpeak);
      if (!autoSpeak) stopSpeak();
    };
    header.appendChild(toggle);
  }

  // 显示欢迎语
  addMessage("bot", AI_CONFIG.welcomeMessage.replace("{村庄名}", VILLAGE_INFO.villageName));

  // 生成快捷问题（基于点位关键词）
  const quickQs = document.getElementById("quickQuestions");
  const defaultQuestions = [
    "这个村有多久历史？",
    "村里最老的建筑是什么？",
    "讲讲村子的由来"
  ];
  defaultQuestions.forEach(function (q) {
    const btn = document.createElement("button");
    btn.textContent = q;
    btn.onclick = function () {
      document.getElementById("aiInput").value = q;
      sendQuestion();
    };
    quickQs.appendChild(btn);
  });
}

function toggleAIPanel() {
  const panel = document.getElementById("aiPanel");
  panel.classList.toggle("open");
  if (panel.classList.contains("open")) {
    document.getElementById("aiInput").focus();
    scrollMessagesToBottom();
  }
}

function openAIPanel() {
  document.getElementById("aiPanel").classList.add("open");
  scrollMessagesToBottom();
}

function addMessage(role, text) {
  const container = document.getElementById("aiMessages");
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.textContent = text;

  // AI正式回复（非"正在思考"提示）加朗读按钮
  if (role === "bot" && !div.classList.contains("typing")) {
    const br = document.createElement("br");
    const speakBtn = document.createElement("button");
    speakBtn.className = "speak-btn";
    speakBtn.textContent = "🔊 朗读";
    const startSpeak = function () {
      // 先停止其他正在朗读的
      stopSpeak();
      currentSpeakBtn = speakBtn;
      speakBtn.textContent = "⏸ 朗读中... 点击停止";
      speakBtn.onclick = function () { stopSpeak(); };
      speak(text);
      // 朗读结束后恢复（Azure通过onended/stopSpeak重置；浏览器语音轮询检测）
      const checkEnd = setInterval(function () {
        const azureDone = !currentAudio;
        let browserDone = true;
        if (window.speechSynthesis && window.speechSynthesis.speaking) browserDone = false;
        if (currentSpeakBtn === speakBtn && azureDone && browserDone) {
          clearInterval(checkEnd);
          speakBtn.textContent = "🔊 朗读";
          speakBtn.onclick = startSpeak;
          currentSpeakBtn = null;
        }
      }, 400);
    };
    speakBtn.onclick = startSpeak;
    div.appendChild(br);
    div.appendChild(speakBtn);
    // 自动朗读
    if (autoSpeak) speak(text);
  }

  container.appendChild(div);
  scrollMessagesToBottom();
  return div;
}

// ============================================================
//  语音朗读 —— 优先 Azure TTS（真人自然粤语），否则回退浏览器自带
// ============================================================
let currentAudio = null;      // Azure TTS 播放的 audio 对象
let currentSpeakBtn = null;   // 当前正在朗读对应的按钮

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function speak(text) {
  speakWithBrowser(text);
}

async function speakWithAzure(text) {
  stopSpeak();
  const cfg = AI_CONFIG.tts;
  const ssml =
    "<speak version='1.0' xml:lang='zh-HK'>" +
    "<voice name='" + cfg.voice + "'>" +
    escapeXml(text) +
    "</voice></speak>";
  const res = await fetch(
    "https://" + cfg.region + ".tts.speech.microsoft.com/cognitiveservices/v1",
    {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + cfg.azureKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3"
      },
      body: ssml
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error("Azure TTS错误 " + res.status + "：" + t.substring(0, 150));
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  currentAudio = new Audio(url);
  currentAudio.onended = function () { stopSpeak(); };
  await currentAudio.play();
}

function speakWithBrowser(text) {
  if (!window.speechSynthesis) {
    alert("你的浏览器不支持语音朗读，请用Chrome/Edge。");
    return;
  }
  window.speechSynthesis.cancel();
  const segments = splitText(text, 180);
  segments.forEach(function (seg) {
    const u = new SpeechSynthesisUtterance(seg);
    u.lang = "zh-HK";
    u.rate = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const yueVoice =
      voices.find(v => v.lang === "zh-HK") ||
      voices.find(v => v.lang.indexOf("zh-HK") === 0) ||
      voices.find(v => v.lang.indexOf("yue") === 0) ||
      voices.find(v => v.lang === "zh-CN" || v.lang.indexOf("zh") === 0);
    if (yueVoice) u.voice = yueVoice;
    window.speechSynthesis.speak(u);
  });
}

function stopSpeak() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (currentSpeakBtn) {
    currentSpeakBtn.textContent = "🔊 朗读";
    currentSpeakBtn.onclick = currentSpeakBtn._startHandler;
    currentSpeakBtn = null;
  }
}

// 长文本按标点分段（浏览器自带语音用，避免截断）
function splitText(text, maxLen) {
  const result = [];
  const punct = "。！？；\n，、";
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + maxLen, text.length);
    if (end < text.length) {
      for (let j = end; j > i; j--) {
        if (punct.indexOf(text[j - 1]) >= 0) { end = j; break; }
      }
    }
    result.push(text.substring(i, end));
    i = end;
  }
  return result;
}

function scrollMessagesToBottom() {
  const container = document.getElementById("aiMessages");
  container.scrollTop = container.scrollHeight;
}

async function sendQuestion() {
  const input = document.getElementById("aiInput");
  const question = input.value.trim();
  if (!question) return;

  addMessage("user", question);
  input.value = "";

  const sendBtn = document.getElementById("aiSendBtn");
  sendBtn.disabled = true;

  const typingIndicator = addMessage("bot typing", "讲解员正在思考...");

  try {
    const answer = await callAI(question);
    typingIndicator.remove();
    addMessage("bot", answer);
  } catch (err) {
    typingIndicator.remove();
    addMessage("bot", "抱歉，讲解员暂时开小差了：" + err.message + "\n\n请检查 config.js 里的 API 配置是否正确。");
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

// ============================================================
//  调用大模型 API（OpenAI 兼容格式，国产模型通用）
// ============================================================
async function callAI(question) {
  // 检查配置
  if (!AI_CONFIG.apiKey || AI_CONFIG.apiKey === "在此粘贴你的API Key") {
    throw new Error("尚未配置 API Key，请在 config.js 中填入");
  }

  // 组装提示词：系统提示 + 村史资料 + 当前点位上下文 + 历史对话
  const systemContent = AI_CONFIG.systemPrompt.replace("{村庄名}", VILLAGE_INFO.villageName) + VILLAGE_HISTORY;

  let userContent = question;
  if (currentPointContext) {
    userContent = "【用户正在查看的点位】" + currentPointContext.name + "（" + currentPointContext.category + "）\n" +
                  "点位简介：" + currentPointContext.intro + "\n\n" +
                  "【用户提问】" + question;
  }

  // 构建消息列表（保留最近几轮对话）
  const messages = [
    { role: "system", content: systemContent }
  ];
  aiMessages.forEach(m => messages.push(m));
  messages.push({ role: "user", content: userContent });

  // 记录到历史
  aiMessages.push({ role: "user", content: userContent });

  // 调用API
  const response = await fetch(AI_CONFIG.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + AI_CONFIG.apiKey
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages: messages,
      temperature: 1,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error("API返回错误 " + response.status + "：" + errText.substring(0, 100));
  }

  const data = await response.json();
  const answer = data.choices[0].message.content;

  // 记录AI回复到历史
  aiMessages.push({ role: "assistant", content: answer });

  return answer;
}
