(() => {
  'use strict';
  const form = document.querySelector('#workshop-form');
  const key = 'warm-laundry-workshop-v1';
  const fields = ['garment', 'keywords', 'seed', 'title', 'body'];
  const limits = {garment:100,keywords:200,seed:3000,title:120,body:20000};
  const status = document.querySelector('#save-status');
  const preview = document.querySelector('#draft-preview');
  let dirty = false;
  function data() {
    const result = {version:1};
    fields.forEach(name => {result[name] = form.elements[name].value;});
    result.visibility = form.elements.visibility.value;
    return result;
  }
  function render() {
    const draft = data();
    const count = Array.from(draft.body).length;
    const hint = count === 0 ? '첫 문장을 기다리고 있어요.' : count < 3000 ? `권장 분량까지 ${3000-count}자 남았어요.` : count <= 5000 ? '권장 분량 안에 들어왔어요.' : '권장 분량보다 길어요. 필요하면 천천히 다듬어 주세요.';
    document.querySelector('#word-count').textContent = `${count.toLocaleString('ko-KR')}자 · ${hint}`;
    document.querySelector('#preview-title').textContent = draft.title.trim() || '아직 이름 없는 이야기';
    document.querySelector('#preview-body').textContent = draft.body || '본문을 적으면 여기에서 읽어볼 수 있어요.';
    const isPublic = draft.visibility === 'public';
    document.querySelector('#public-options').hidden = !isPublic;
    document.querySelector('#visibility-summary').textContent = isPublic ? '익명 공개 투고를 준비하는 원고입니다. 아직 전송·공개되지 않았습니다.' : '나만 간직할 원고입니다. 서버에 보내지 않습니다.';
  }
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && saved.version === 1 && fields.every(name => typeof saved[name] === 'string' && saved[name].length <= limits[name]) && ['private','public'].includes(saved.visibility)) {
      fields.forEach(name => {form.elements[name].value = saved[name];});
      form.elements.visibility.value = saved.visibility;
      status.textContent = '이 기기에 저장했던 원고를 불러왔습니다. 공개되거나 투고된 글은 아닙니다.';
    } else if (saved) status.textContent = '저장된 원고 형식을 읽지 못했습니다. 기존 저장값은 보존했습니다. 새로 저장하면 교체됩니다.';
  } catch (_) { status.textContent = '이 기기의 저장 공간을 읽지 못했습니다. 원고 파일 내려받기를 이용해 주세요.'; }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', () => {dirty = true;status.textContent = '수정한 내용이 아직 저장되지 않았습니다.';render();});
  document.querySelector('#preview-toggle').addEventListener('click', event => {
    preview.hidden = !preview.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!preview.hidden));
    event.currentTarget.textContent = preview.hidden ? '독자처럼 미리 읽기' : '미리보기 접기';
    render();
  });
  document.querySelector('#save-draft').addEventListener('click', () => {
    try { localStorage.setItem(key, JSON.stringify(data()));dirty = false;status.textContent = '이 기기에 저장했습니다. 서버 전송이나 투고는 하지 않았습니다.'; }
    catch (_) {status.textContent = '저장하지 못했습니다. 저장 공간 설정을 확인하거나 원고 파일을 내려받아 주세요.';}
  });
  document.querySelector('#download-draft').addEventListener('click', () => {
    const draft = data();
    const text = `${draft.title || '아직 이름 없는 이야기'}\n\n${draft.body}\n\n--- 작업 메모 ---\n옷: ${draft.garment}\n키워드: ${draft.keywords}\n소재:\n${draft.seed}\n\n공개 의향: ${draft.visibility === 'public' ? '익명 공개 투고 준비' : '나만 간직하기'}\n이 파일은 투고·공개되지 않은 개인 원고입니다.\n`;
    const url = URL.createObjectURL(new Blob(['\ufeff',text], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');link.href = url;link.download = '세탁소-내-원고.txt';document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    document.querySelector('#download-status').textContent = '원고 파일 내려받기를 요청했습니다. 기기의 다운로드 목록을 확인해 주세요.';
  });
  window.addEventListener('beforeunload', event => {if(dirty){event.preventDefault();event.returnValue = '';}});
  render();
})();
