const COMMON = new Set(["password","123456","password1","qwerty","abc123","letmein","monkey","iloveyou","admin","welcome","login","passw0rd","master","hello","shadow","sunshine","princess","dragon","password123","123456789","12345678","12345","1234","111111","000000","qwerty123","password1!","pass","test","guest","root","toor","changeme","trustno1","baseball","football","superman","batman","access","mustang","michael","jessica","pepper","hunter"]);

const SEQS = ["abcdefghijklmnopqrstuvwxyz","zyxwvutsrqponmlkjihgfedcba","qwertyuiop","poiuytrewq","asdfghjkl","lkjhgfdsa","zxcvbnm","mnbvcxz","0123456789","9876543210"];

const SEG_COLORS = ['','#ff1744','#ff6d00','#ffd600','#00e676','#00e5ff'];

const $  = id => document.getElementById(id);

function charsetSize(pw) {
  let s = 0;
  if (/[a-z]/.test(pw)) s += 26;
  if (/[A-Z]/.test(pw)) s += 26;
  if (/[0-9]/.test(pw)) s += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) s += 32;
  return s;
}

function entropy(pw) {
  const cs = charsetSize(pw);
  return cs && pw.length ? pw.length * Math.log2(cs) : 0;
}

function crackTime(bits) {
  const rate = 1e12;
  const avg  = Math.pow(2, bits) / 2;
  const sec  = avg / rate;
  if (sec < 1)           return '< 1 second';
  if (sec < 60)          return Math.round(sec) + ' sec';
  if (sec < 3600)        return Math.round(sec/60) + ' min';
  if (sec < 86400)       return Math.round(sec/3600) + ' hrs';
  if (sec < 31536000)    return Math.round(sec/86400) + ' days';
  const y = sec/31536000;
  if (y < 1e3)           return Math.round(y) + ' years';
  if (y < 1e6)           return (y/1e3).toFixed(1) + 'K years';
  if (y < 1e9)           return (y/1e6).toFixed(1) + 'M years';
  return 'billions of years';
}

function fmtCombos(bits) {
  const n = Math.pow(2, bits);
  if (n < 1e6)  return n.toFixed(0);
  if (n < 1e9)  return (n/1e6).toFixed(1)  + 'M';
  if (n < 1e12) return (n/1e9).toFixed(1)  + 'B';
  if (n < 1e15) return (n/1e12).toFixed(1) + 'T';
  if (n < 1e18) return (n/1e15).toFixed(1) + 'Q';
  return '10^' + Math.floor(bits * Math.log10(2));
}

function hasRepeat(pw) { return /(.)\1{2,}/.test(pw); }

function hasSeq(pw) {
  const l = pw.toLowerCase();
  for (const s of SEQS)
    for (let i = 0; i <= s.length-3; i++)
      if (l.includes(s.slice(i,i+3))) return true;
  return false;
}

function setCheck(key, pass, value) {
  const item = $('ci-'+key), dot = $('cd-'+key), cv = $('cv-'+key);
  item.className = 'check-item ' + (pass ? 'pass' : 'fail');
  dot.textContent = pass ? '✓' : '✗';
  cv.textContent = value;
}

function resetCheck(key) {
  $('ci-'+key).className = 'check-item';
  $('cd-'+key).textContent = '?';
  $('cv-'+key).textContent = 'not checked';
}

let lastLevel = '';

function analyze() {
  const pw = $('pwInput').value;

  if (!pw) {
    [1,2,3,4,5].forEach(i => { const s = $('seg'+i); s.style.background=''; s.classList.remove('lit'); });
    $('strengthWord').textContent = '— AWAITING INPUT';
    $('strengthWord').style.color = 'var(--text3)';
    $('crackTime').textContent = '';
    $('entropyFill').style.width = '0%';
    $('entropyLabel').textContent = '0 bits';
    $('sScore').textContent = '—';
    $('sLen').textContent = '—';
    $('sCharset').textContent = '—';
    $('sCombos').textContent = '—';
    $('tipBox').style.display = 'none';
    ['len','upper','lower','num','sym','rep','seq','common'].forEach(resetCheck);
    lastLevel = '';
    return;
  }

  const checks = {
    len:    pw.length >= 12,
    upper:  /[A-Z]/.test(pw),
    lower:  /[a-z]/.test(pw),
    num:    /[0-9]/.test(pw),
    sym:    /[^a-zA-Z0-9]/.test(pw),
    rep:    !hasRepeat(pw),
    seq:    !hasSeq(pw),
    common: !COMMON.has(pw.toLowerCase()),
  };

  const labels = {
    len:    checks.len    ? pw.length + ' chars — ok'  : pw.length + ' chars — need 12+',
    upper:  checks.upper  ? 'A–Z detected'             : 'none found',
    lower:  checks.lower  ? 'a–z detected'             : 'none found',
    num:    checks.num    ? '0–9 detected'              : 'none found',
    sym:    checks.sym    ? 'symbol detected'           : 'none found',
    rep:    checks.rep    ? 'no repeats'                : 'repeating chars found',
    seq:    checks.seq    ? 'no sequences'              : 'keyboard sequence found',
    common: checks.common ? 'not in blacklist'          : '⚠ BLACKLISTED',
  };

  Object.keys(checks).forEach(k => setCheck(k, checks[k], labels[k]));

  const score = Object.values(checks).filter(Boolean).length;
  const ent   = entropy(pw);
  const cs    = charsetSize(pw);
  const ct    = crackTime(ent);

  $('sScore').textContent   = score + '/8';
  $('sLen').textContent     = pw.length;
  $('sCharset').textContent = cs;
  $('sCombos').textContent  = fmtCombos(ent);
  $('entropyLabel').textContent = Math.round(ent) + ' bits';

  const entPct = Math.min(100, (ent / 128) * 100);
  const entFill = $('entropyFill');
  entFill.style.width = entPct + '%';

  let level, levelText, levelColor;
  if (!checks.common || score <= 2 || ent < 28) {
    level = 1; levelText = 'WEAK'; levelColor = '#ff1744';
    entFill.style.background = '#ff1744';
  } else if (score <= 4 || ent < 40) {
    level = 2; levelText = 'FAIR'; levelColor = '#ff6d00';
    entFill.style.background = '#ff6d00';
  } else if (score <= 5 || ent < 52) {
    level = 3; levelText = 'GOOD'; levelColor = '#ffd600';
    entFill.style.background = '#ffd600';
  } else if (score <= 7 || ent < 70) {
    level = 4; levelText = 'STRONG'; levelColor = '#00e676';
    entFill.style.background = '#00e676';
  } else {
    level = 5; levelText = 'UNBREAKABLE'; levelColor = '#00e5ff';
    entFill.style.background = '#00e5ff';
  }

  [1,2,3,4,5].forEach(i => {
    const seg = $('seg'+i);
    seg.classList.remove('lit');
    seg.style.background = i <= level ? levelColor : '';
    if (i <= level) setTimeout(() => seg.classList.add('lit'), i * 60);
  });

  $('strengthWord').textContent = levelText;
  $('strengthWord').style.color = levelColor;
  $('crackTime').textContent = '[ CRACK: ' + ct.toUpperCase() + ' ]';

  const tips = [];
  if (!checks.common)  tips.push('PASSWORD IS IN COMMON BLACKLIST — CHANGE IMMEDIATELY');
  if (!checks.len)     tips.push('USE AT LEAST 12 CHARACTERS (16+ RECOMMENDED)');
  if (!checks.upper)   tips.push('ADD UPPERCASE LETTERS (A–Z)');
  if (!checks.lower)   tips.push('ADD LOWERCASE LETTERS (a–z)');
  if (!checks.num)     tips.push('INCLUDE AT LEAST ONE DIGIT (0–9)');
  if (!checks.sym)     tips.push('ADD A SPECIAL SYMBOL: !@#$%^&*');
  if (!checks.rep)     tips.push('AVOID REPEATING CHARACTERS (aaa, 111...)');
  if (!checks.seq)     tips.push('AVOID KEYBOARD SEQUENCES (abc, qwerty, 123...)');

  const tipBox = $('tipBox');
  if (tips.length) {
    const bgMap = { '#ff1744':'rgba(255,23,68,0.06)', '#ff6d00':'rgba(255,109,0,0.06)', '#ffd600':'rgba(255,214,0,0.06)', '#00e676':'rgba(0,230,118,0.06)', '#00e5ff':'rgba(0,229,255,0.06)' };
    tipBox.style.display = 'block';
    tipBox.style.borderColor = levelColor;
    tipBox.style.background = bgMap[levelColor] || 'transparent';
    tipBox.style.color = levelColor;
    tipBox.innerHTML = '<span style="opacity:0.5">// RECOMMENDATIONS:</span><br>' + tips.slice(0,3).map(t => '&gt; ' + t).join('<br>');
  } else {
    tipBox.style.display = 'block';
    tipBox.style.borderColor = '#00e5ff';
    tipBox.style.background = 'rgba(0,229,255,0.05)';
    tipBox.style.color = '#00e5ff';
    tipBox.innerHTML = '// ALL CHECKS PASSED<br>&gt; CRYPTOGRAPHICALLY STRONG — ENTROPY: ' + Math.round(ent) + ' BITS';
  }

  if (pw !== lastLevel) {
    addHistory(pw, levelText.toLowerCase().replace(' ', ''));
    lastLevel = pw;
  }
}

function addHistory(pw, level) {
  const list = $('historyList');
  const empty = list.querySelector('.history-empty');
  if (empty) empty.remove();

  const masked = pw.slice(0,3) + '*'.repeat(Math.max(0, pw.length-3));
  const li = document.createElement('li');
  li.className = 'history-item';
  li.innerHTML = `<span class="h-pw">${masked}</span><span class="h-badge ${level}">${level.toUpperCase()}</span><span style="font-family:var(--mono);font-size:10px;color:var(--text3)">${pw.length}c</span>`;
  list.prepend(li);
  if (list.children.length > 8) list.lastChild.remove();
}

$('pwInput').addEventListener('input', analyze);

$('toggleBtn').addEventListener('click', () => {
  const inp = $('pwInput');
  inp.type = inp.type === 'password' ? 'text' : 'password';
  $('toggleBtn').textContent = inp.type === 'password' ? '👁' : '🙈';
});

$('clearBtn').addEventListener('click', () => {
  $('pwInput').value = '';
  analyze();
});

// GENERATOR
const genToggles = { upper: true, lower: true, digits: true, syms: true, ambig: false };

document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const k = btn.dataset.key;
    genToggles[k] = !genToggles[k];
    btn.classList.toggle('active', genToggles[k]);
  });
});

$('genLen').addEventListener('input', e => { $('genLenVal').textContent = e.target.value; });

let lastGenerated = '';

$('genBtn').addEventListener('click', () => {
  let charset = '';
  const AMBIG = 'O0Il1';
  if (genToggles.upper)  charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (genToggles.lower)  charset += 'abcdefghijklmnopqrstuvwxyz';
  if (genToggles.digits) charset += '0123456789';
  if (genToggles.syms)   charset += '!@#$%^&*()-_=+[]{}|;:,.<>?';
  if (genToggles.ambig)  charset = charset.split('').filter(c => !AMBIG.includes(c)).join('');
  if (!charset) charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const len  = parseInt($('genLen').value);
  const arr  = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let pw = Array.from(arr, v => charset[v % charset.length]).join('');

  lastGenerated = pw;
  const textEl = $('genText');
  textEl.className = 'pw-text';
  textEl.textContent = pw;
  textEl.style.color = 'var(--amber)';

  const useBtn = $('useBtn');
  useBtn.style.display = 'flex';
});

$('useBtn').addEventListener('click', () => {
  if (!lastGenerated) return;
  const inp = $('pwInput');
  inp.value = lastGenerated;
  inp.type  = 'text';
  $('toggleBtn').textContent = '🙈';
  analyze();
  inp.scrollIntoView({ behavior: 'smooth' });
});

$('copyGenBtn').addEventListener('click', () => {
  if (!lastGenerated) return;
  navigator.clipboard.writeText(lastGenerated).then(() => {
    const btn = $('copyGenBtn');
    btn.textContent = '✓';
    btn.style.color = 'var(--green)';
    setTimeout(() => { btn.textContent = '⎘'; btn.style.color = ''; }, 1500);
  });
});