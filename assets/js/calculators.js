/* =========================================================
   轻与壮 — 热量 / 蛋白质计算器
   Mifflin-St Jeor + 活动系数，缺口按体重百分比换算
   ========================================================= */
(function () {
  'use strict';

  var KCAL_PER_KG_FAT = 7700;

  function num(id, fallback) {
    var el = document.getElementById(id);
    if (!el) return fallback;
    var v = parseFloat(el.value);
    return isNaN(v) || v <= 0 ? fallback : v;
  }

  function sexOf(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : 'f';
  }

  function activityOf(id) {
    var el = document.getElementById(id);
    var v = el ? parseFloat(el.value) : 1.375;
    return isNaN(v) ? 1.375 : v;
  }

  function bmr(sex, w, h, a) {
    var base = 10 * w + 6.25 * h - 5 * a;
    return sex === 'm' ? base + 5 : base - 161;
  }

  function fmt(n) {
    var lang = (window.LS && window.LS.getLang && window.LS.getLang()) || 'zh';
    return Math.round(n).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US');
  }

  function setOut(name, value) {
    var el = document.querySelector('[data-out="' + name + '"]');
    if (el) el.textContent = value;
  }

  function toggleNote(id, show) {
    var el = document.getElementById(id);
    if (el) el.hidden = !show;
  }

  /* ---------- 减脂计算器 ---------- */
  function calcFat() {
    var root = document.getElementById('calcFat');
    if (!root) return;

    var sex = sexOf('fatSex');
    var age = Math.min(90, Math.max(14, num('fatAge', 30)));
    var height = Math.min(220, Math.max(130, num('fatHeight', 165)));
    var weight = Math.min(250, Math.max(35, num('fatWeight', 65)));
    var act = activityOf('fatActivity');
    var rate = parseFloat((document.getElementById('fatRate') || {}).value || '0.0075');

    var b = bmr(sex, weight, height, age);
    var tdee = b * act;

    // 目标缺口：按“每周减少体重的 x%”换算
    var deficit = (weight * rate * KCAL_PER_KG_FAT) / 7;
    deficit = Math.min(deficit, 900);

    var floor = Math.max(b * 1.1, sex === 'm' ? 1500 : 1200);
    var target = Math.max(tdee - deficit, floor);
    var actualDeficit = tdee - target;
    var weekly = (actualDeficit * 7) / KCAL_PER_KG_FAT;

    var protein = Math.round(weight * 1.8);
    var fat = Math.round(weight * 0.8);
    var carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));

    setOut('fatTdee', fmt(tdee));
    setOut('fatTarget', fmt(target));
    setOut('fatWeekly', weekly.toFixed(2));
    setOut('fatDeficit', fmt(actualDeficit));
    setOut('fatProtein', protein);
    setOut('fatFat', fat);
    setOut('fatCarbs', carbs);

    toggleNote('fatFloorNote', actualDeficit < deficit - 5);
  }

  /* ---------- 增肌计算器 ---------- */
  function calcMuscle() {
    var root = document.getElementById('calcMuscle');
    if (!root) return;

    var sex = sexOf('muscleSex');
    var age = Math.min(90, Math.max(14, num('muscleAge', 25)));
    var height = Math.min(220, Math.max(130, num('muscleHeight', 175)));
    var weight = Math.min(250, Math.max(35, num('muscleWeight', 65)));
    var act = activityOf('muscleActivity');
    var surplusPct = parseFloat((document.getElementById('muscleSurplus') || {}).value || '0.08');
    var proteinPerKg = parseFloat((document.getElementById('muscleProtein') || {}).value || '1.8');

    var b = bmr(sex, weight, height, age);
    var tdee = b * act;
    var target = tdee * (1 + surplusPct);
    var surplus = target - tdee;
    var weekly = (surplus * 7) / KCAL_PER_KG_FAT;

    var protein = Math.round(weight * proteinPerKg);
    var fat = Math.round(weight * 0.9);
    var carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));

    setOut('muscleTdee', fmt(tdee));
    setOut('muscleTarget', fmt(target));
    setOut('muscleSurplus', fmt(surplus));
    setOut('muscleWeekly', weekly.toFixed(2));
    setOut('muscleProtein', protein);
    setOut('muscleFat', fat);
    setOut('muscleCarbs', carbs);
  }

  function bind(rootId, fn) {
    var root = document.getElementById(rootId);
    if (!root) return;
    root.addEventListener('input', fn);
    root.addEventListener('change', fn);
    fn();
  }

  function init() {
    bind('calcFat', calcFat);
    bind('calcMuscle', calcMuscle);
    document.addEventListener('langchange', function () {
      calcFat();
      calcMuscle();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
