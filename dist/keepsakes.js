(() => {
  const key = 'warm-laundry-keepsakes-v1';
  let state = {saved:false,chapter:1,note:''};
  const en = () => document.documentElement.lang === 'en';
  const text = (ko,english) => en() ? english : ko;
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    if (stored && typeof stored === 'object') state = {saved:stored.saved === true,chapter:stored.chapter === 2 ? 2 : 1,note:typeof stored.note === 'string' ? stored.note.slice(0,300) : ''};
  } catch (_) {}
  function persist() {
    try { localStorage.setItem(key,JSON.stringify(state)); return true; }
    catch (_) { return false; }
  }
  const container = document.querySelector('#saved-clothes');
  const status = document.querySelector('#keepsake-status');
  function render() {
    document.querySelectorAll('[data-ko][data-en]').forEach(el => { el.textContent = en() ? el.dataset.en : el.dataset.ko; });
    container.replaceChildren();
    if (!state.saved) {
      const empty=document.createElement('p'); empty.className='empty-keepsakes';
      empty.textContent=text('아직 걸어둔 옷이 없습니다. 이야기를 읽고 마음에 남은 옷을 걸어두세요.','No clothes saved yet. Read a story and hang a garment here.'); container.append(empty);
    } else {
      const card=document.createElement('article'); card.className='saved-garment';
      const title=document.createElement('h3'); title.textContent=text('아버지의 양복','Father’s Suit');
      const progress=document.createElement('p'); progress.textContent=text(`${state.chapter}장에 책갈피가 꽂혀 있습니다.`,`Bookmarked at Chapter ${state.chapter}.`);
      const link=document.createElement('a'); link.className='glow-button'; link.href=state.chapter===2?'#father-suit-2':'#father-suit'; link.textContent=text('이어 읽기','Continue reading');
      card.append(title,progress,link);
      if (state.note) {
        const label=document.createElement('h4'); label.textContent=text('남겨둔 쪽지','Your folded note');
        const note=document.createElement('p'); note.className='folded-note'; note.textContent=state.note;
        const remove=document.createElement('button'); remove.type='button'; remove.className='note-delete'; remove.textContent=text('쪽지 지우기','Delete note');
        remove.addEventListener('click',()=>{const previous=state.note;state.note='';if(!persist()){state.note=previous;status.textContent=text('저장 공간에 접근할 수 없어 지우지 못했어요.','Storage unavailable. Could not delete your note.');return;}syncForms();render();});
        card.append(label,note,remove);
      }
      container.append(card);
    }
    document.querySelectorAll('.save-garment').forEach(button=>{button.textContent=state.saved?text('보관함에 걸어두었어요 ✓','Saved in your keepsakes ✓'):text('나의 보관함에 걸어두기','Hang in my keepsakes');});
  }
  function syncForms() { document.querySelectorAll('.keepsake-form textarea').forEach(el=>{el.value=state.note;}); }
  document.querySelectorAll('.save-garment').forEach(button=>button.addEventListener('click',()=>{
    state.saved=true;
    const ok=persist();render();
    button.closest('.laundry-ticket').querySelector('.note-status').textContent=ok?text('이 기기의 보관함에 걸어두었습니다.','Saved on this device.'):text('저장 공간에 접근할 수 없어 저장하지 못했어요.','Storage unavailable. Your changes could not be saved.');
  }));
  document.querySelectorAll('.keepsake-form').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();const note=form.elements.note.value.trim();
    if(!note){form.querySelector('.note-status').textContent=text('남기고 싶은 마음을 짧게 적어주세요.','Write a short note first.');return;}
    state.note=note;state.saved=true;
    const ok=persist();syncForms();render();
    form.querySelector('.note-status').textContent=ok?text('쪽지를 접어 보관함에 넣었습니다.','Your folded note is saved.'):text('저장 공간에 접근할 수 없어 저장하지 못했어요.','Storage unavailable. Your changes could not be saved.');
  }));
  function bookmark() {if(location.hash==='#father-suit'||location.hash==='#father-suit-2'){state.chapter=location.hash.endsWith('-2')?2:1;if(state.saved)persist();render();}}
  window.addEventListener('hashchange',bookmark);
  const preview=document.querySelector('#garment-preview');let trigger;
  document.querySelectorAll('[data-preview]').forEach(button=>button.addEventListener('click',()=>{
    trigger=button;
    document.querySelector('#garment-preview-title').textContent=button.querySelector('.garment-title').textContent;
    document.querySelector('#garment-preview-description').textContent=button.querySelector('.garment-description').textContent;
    preview.showModal();
  }));
  preview.querySelector('button').addEventListener('click',()=>preview.close());
  preview.addEventListener('close',()=>trigger?.focus());
  new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  syncForms();render();bookmark();
})();
