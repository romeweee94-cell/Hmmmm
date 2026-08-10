function goTo(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id==='screen-math') startMathGame();
  if(id==='screen-block') startBlockGame();
  if(id==='screen-puzzle') startPuzzleGame();
}

/* ---------- Math game ---------- */
let mathIndex = 0;
let mathQuestions = [];

function genQuestions(){
  mathQuestions = [];
  for(let i=0;i<3;i++){
    const a = Math.floor(Math.random()*10)+1;
    const b = Math.floor(Math.random()*10)+1;
    const ops = ['+','-'];
    const op = i===2 ? '×' : ops[Math.floor(Math.random()*ops.length)];
    let answer, text;
    if(op==='+'){ answer=a+b; text=`${a} + ${b}`; }
    else if(op==='-'){ const hi=Math.max(a,b), lo=Math.min(a,b); answer=hi-lo; text=`${hi} - ${lo}`; }
    else { const x=Math.floor(Math.random()*5)+1, y=Math.floor(Math.random()*5)+1; answer=x*y; text=`${x} × ${y}`; }
    const choices = new Set([answer]);
    while(choices.size<4){
      const delta = Math.floor(Math.random()*7)-3;
      const wrong = answer+delta;
      if(wrong!==answer && wrong>=0) choices.add(wrong);
    }
    mathQuestions.push({text, answer, choices: shuffle([...choices])});
  }
}
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
function startMathGame(){
  mathIndex = 0;
  genQuestions();
  renderDots();
  renderQuestion();
}
function renderDots(){
  const wrap = document.getElementById('math-dots');
  wrap.innerHTML = '';
  for(let i=0;i<mathQuestions.length;i++){
    const d = document.createElement('div');
    d.className = 'dot' + (i<mathIndex ? ' done' : '');
    wrap.appendChild(d);
  }
}
function renderQuestion(){
  const q = mathQuestions[mathIndex];
  document.getElementById('math-question').textContent = q.text;
  document.getElementById('math-feedback').textContent = '';
  const choicesEl = document.getElementById('math-choices');
  choicesEl.innerHTML = '';
  q.choices.forEach(c=>{
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = c;
    btn.onclick = () => checkAnswer(c, btn);
    choicesEl.appendChild(btn);
  });
}
function checkAnswer(value, btn){
  const q = mathQuestions[mathIndex];
  const allBtns = document.querySelectorAll('.choice-btn');
  allBtns.forEach(b=>b.disabled=true);
  if(value === q.answer){
    btn.classList.add('correct');
    document.getElementById('math-feedback').textContent = 'ถูกต้อง! 🎉';
    document.getElementById('math-feedback').style.color = '#2f8f5b';
    setTimeout(()=>{
      mathIndex++;
      if(mathIndex >= mathQuestions.length){
        goTo('screen-block');
      } else {
        renderDots();
        renderQuestion();
      }
    }, 700);
  } else {
    btn.classList.add('wrong');
    document.getElementById('math-feedback').textContent = 'ลองใหม่นะ';
    document.getElementById('math-feedback').style.color = '#e2554a';
    setTimeout(()=>{
      allBtns.forEach(b=>{ b.disabled=false; b.classList.remove('wrong'); });
      document.getElementById('math-feedback').textContent = '';
    }, 600);
  }
}

/* ---------- Block stacking game ---------- */
let blockTimer = null;
let blockX = 0;
let blockDir = 1;
let blockWidth = 90;
let stackedBlocks = [];
let stackGoal = 3;
let areaWidth = 0;

function startBlockGame(){
  const area = document.getElementById('block-area');
  area.innerHTML = '';
  stackedBlocks = [];
  blockWidth = 90;
  document.getElementById('stack-count').textContent = `ต่อแล้ว 0 / ${stackGoal}`;
  document.getElementById('block-msg').textContent = '';
  document.getElementById('drop-btn').disabled = false;
  areaWidth = area.clientWidth;
  blockX = 0;
  blockDir = 1;
  spawnMovingBlock();
  if(blockTimer) clearInterval(blockTimer);
  blockTimer = setInterval(()=>{
    blockX += blockDir * 3;
    if(blockX + blockWidth >= areaWidth || blockX <= 0) blockDir *= -1;
    const mb = document.getElementById('moving-block');
    if(mb) mb.style.left = blockX + 'px';
  }, 16);
}
function spawnMovingBlock(){
  const area = document.getElementById('block-area');
  const old = document.getElementById('moving-block');
  if(old) old.remove();
  const mb = document.createElement('div');
  mb.className = 'moving-block';
  mb.id = 'moving-block';
  mb.style.width = blockWidth + 'px';
  mb.style.background = ['#FF6F5E','#F3B94D','#BFE3D0','#9BB7D4'][stackedBlocks.length % 4];
  area.appendChild(mb);
  blockX = 0;
  blockDir = 1;
}
function dropBlock(){
  const area = document.getElementById('block-area');
  const mb = document.getElementById('moving-block');
  if(!mb) return;
  const currentLeft = blockX;
  const currentWidth = blockWidth;

  let overlapStart = 0, overlapEnd = currentWidth;
  if(stackedBlocks.length > 0){
    const prev = stackedBlocks[stackedBlocks.length-1];
    overlapStart = Math.max(prev.left, currentLeft);
    overlapEnd = Math.min(prev.left+prev.width, currentLeft+currentWidth);
  }
  const overlapWidth = overlapEnd - overlapStart;

  if(overlapWidth <= 15){
    document.getElementById('block-msg').textContent = 'พลาดไปนิดนึง ลองใหม่นะ 😅';
    document.getElementById('block-msg').style.color = '#e2554a';
    resetBlockStack();
    return;
  }

  const newLeft = overlapStart;
  const newWidth = overlapWidth;
  const bottom = stackedBlocks.length * 30;

  const placed = document.createElement('div');
  placed.className = 'stacked-block';
  placed.style.width = newWidth + 'px';
  placed.style.left = newLeft + 'px';
  placed.style.bottom = bottom + 'px';
  placed.style.background = mb.style.background;
  area.appendChild(placed);
  mb.remove();

  stackedBlocks.push({left:newLeft, width:newWidth});
  blockWidth = newWidth;
  document.getElementById('stack-count').textContent = `ต่อแล้ว ${stackedBlocks.length} / ${stackGoal}`;
  document.getElementById('block-msg').textContent = 'เยี่ยม! 👍';
  document.getElementById('block-msg').style.color = '#2f8f5b';

  if(stackedBlocks.length >= stackGoal){
    clearInterval(blockTimer);
    document.getElementById('drop-btn').disabled = true;
    document.getElementById('block-msg').textContent = 'ผ่านด่านแล้ว! 🎉';
    setTimeout(()=>goTo('screen-puzzle'), 900);
  } else {
    spawnMovingBlock();
  }
}
function resetBlockStack(){
  clearInterval(blockTimer);
  const area = document.getElementById('block-area');
  area.innerHTML = '';
  stackedBlocks = [];
  blockWidth = 90;
  document.getElementById('stack-count').textContent = `ต่อแล้ว 0 / ${stackGoal}`;
  setTimeout(()=>{
    document.getElementById('block-msg').textContent = '';
    spawnMovingBlock();
    blockTimer = setInterval(()=>{
      blockX += blockDir * 3;
      if(blockX + blockWidth >= areaWidth || blockX <= 0) blockDir *= -1;
      const mb = document.getElementById('moving-block');
      if(mb) mb.style.left = blockX + 'px';
    }, 16);
  }, 900);
}

/* ---------- Jigsaw puzzle ---------- */
const PUZZLE_COLS = 3;
const PUZZLE_ROWS = 3;
const BOARD_W = 270;
const BOARD_H = 360;
const SNAP_TOLERANCE = 22;
let puzzlePieces = [];
let placedCount = 0;
let activePiece = null;
let dragOffsetX = 0, dragOffsetY = 0;

function startPuzzleGame(){
  const board = document.getElementById('puzzle-board');
  board.innerHTML = '';
  puzzlePieces = [];
  placedCount = 0;
  document.getElementById('puzzle-msg').textContent = '';

  const pieceW = BOARD_W / PUZZLE_COLS;
  const pieceH = BOARD_H / PUZZLE_ROWS;

  // draw faint slot outlines
  for(let r=0; r<PUZZLE_ROWS; r++){
    for(let c=0; c<PUZZLE_COLS; c++){
      const slot = document.createElement('div');
      slot.className = 'puzzle-slot';
      slot.style.width = pieceW + 'px';
      slot.style.height = pieceH + 'px';
      slot.style.left = (c*pieceW) + 'px';
      slot.style.top = (r*pieceH) + 'px';
      board.appendChild(slot);
    }
  }

  // build piece list with correct target positions
  const targets = [];
  for(let r=0; r<PUZZLE_ROWS; r++){
    for(let c=0; c<PUZZLE_COLS; c++){
      targets.push({row:r, col:c, targetX:c*pieceW, targetY:r*pieceH});
    }
  }

  // scatter starting positions (shuffled, within a margin around/inside the board)
  const scattered = shuffle(targets.map((t,i)=>i));

  targets.forEach((t, i)=>{
    const piece = document.createElement('div');
    piece.className = 'puzzle-piece';
    piece.style.width = pieceW + 'px';
    piece.style.height = pieceH + 'px';
    piece.style.backgroundSize = BOARD_W + 'px ' + BOARD_H + 'px';
    piece.style.backgroundPosition = `-${t.col*pieceW}px -${t.row*pieceH}px`;

    const randSlot = scattered[i];
    const startX = (randSlot % PUZZLE_COLS) * pieceW + (Math.random()*10-5);
    const startY = Math.floor(randSlot / PUZZLE_COLS) * pieceH + (Math.random()*10-5);
    piece.style.left = startX + 'px';
    piece.style.top = startY + 'px';

    piece.dataset.targetX = t.targetX;
    piece.dataset.targetY = t.targetY;
    piece.dataset.placed = 'false';

    piece.addEventListener('pointerdown', onPiecePointerDown);
    board.appendChild(piece);
    puzzlePieces.push(piece);
  });
}

function onPiecePointerDown(e){
  const piece = e.currentTarget;
  if(piece.dataset.placed === 'true') return;
  activePiece = piece;
  piece.classList.add('dragging');
  piece.setPointerCapture(e.pointerId);
  const rect = piece.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  piece.addEventListener('pointermove', onPiecePointerMove);
  piece.addEventListener('pointerup', onPiecePointerUp);
}
function onPiecePointerMove(e){
  if(!activePiece) return;
  const board = document.getElementById('puzzle-board');
  const boardRect = board.getBoundingClientRect();
  let x = e.clientX - boardRect.left - dragOffsetX;
  let y = e.clientY - boardRect.top - dragOffsetY;
  activePiece.style.left = x + 'px';
  activePiece.style.top = y + 'px';
}
function onPiecePointerUp(e){
  if(!activePiece) return;
  const piece = activePiece;
  piece.classList.remove('dragging');
  piece.removeEventListener('pointermove', onPiecePointerMove);
  piece.removeEventListener('pointerup', onPiecePointerUp);

  const curX = parseFloat(piece.style.left);
  const curY = parseFloat(piece.style.top);
  const tx = parseFloat(piece.dataset.targetX);
  const ty = parseFloat(piece.dataset.targetY);

  if(Math.abs(curX - tx) < SNAP_TOLERANCE && Math.abs(curY - ty) < SNAP_TOLERANCE){
    piece.style.left = tx + 'px';
    piece.style.top = ty + 'px';
    piece.dataset.placed = 'true';
    piece.classList.add('placed');
    piece.style.cursor = 'default';
    placedCount++;
    document.getElementById('puzzle-msg').textContent = `ต่อแล้ว ${placedCount} / ${puzzlePieces.length}`;
    document.getElementById('puzzle-msg').style.color = '#2f8f5b';

    if(placedCount >= puzzlePieces.length){
      document.getElementById('puzzle-msg').textContent = 'ต่อครบแล้ว! 🎉';
      setTimeout(()=>goTo('screen-envelope'), 900);
    }
  }
  activePiece = null;
}

/* ---------- Envelope ---------- */
function openEnvelope(){
  const env = document.getElementById('envelope');
  if(env.classList.contains('open')) return;
  env.classList.add('open');
  document.getElementById('env-hint').textContent = '';
  launchConfetti();
}
function launchConfetti(){
  const stage = document.getElementById('stage');
  const colors = ['#FF6F5E','#F3B94D','#BFE3D0','#9BB7D4','#FFB3A7'];
  for(let i=0;i<40;i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    const size = 6 + Math.random()*6;
    c.style.width = size+'px';
    c.style.height = (size*0.4)+'px';
    c.style.left = Math.random()*100+'%';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.transform = `rotate(${Math.random()*360}deg)`;
    stage.appendChild(c);
    const duration = 1800 + Math.random()*1200;
    const drift = (Math.random()-0.5)*120;
    c.animate([
      { transform: c.style.transform + ' translate(0,0)', opacity:1 },
      { transform: `rotate(${Math.random()*720}deg) translate(${drift}px, 620px)`, opacity:0 }
    ], { duration, easing:'ease-in' });
    setTimeout(()=>c.remove(), duration+50);
  }
}
