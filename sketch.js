// --- 1. 전역 변수 선언 ---

// 캔버스 설정
let canvasSize = 16; // 32x32 픽셀 캔버스
let pixelSize; // 화면에 표시될 픽셀 한 개의 크기 (자동 계산됨)
let gridData; // 32x32 캔버스의 색상 데이터를 저장할 2D 배열

// 도구 상태
let currentTool = 'pencil'; // 'pencil', 'rectangle'
let currentColor; // p5.Color 객체 (현재 선택된 색)
let isDrawing = false; // 마우스 버튼이 눌렸는지 여부

// 드래그 좌표
let startCol, startRow; // 드래그 시작 셀의 좌표
let lastCol, lastRow; // 연필 도구에서 마지막으로 그려진 셀의 좌표

// UI 요소
let btnPencil, btnRect, btnBlack, btnWhite;
let btnSavePNG;
let inputFileName;
let labelSaveName; // '저장명' 안내 텍스트
// 💡 불러오기 기능 UI 추가
let inputLoadPNG; // 파일 불러오기 버튼 (실제는 input type="file")


// --- 💡 사운드 변수 ---
let do1Sound = null; // 픽셀 '띡' 소리용 (Do1.mp3)
let dragSound = null;  // '드르륵' 사운드용 (Do1.mp3)
let lastSnapW = null, lastSnapH = null; // 사운드 중복 방지용
// -----------------------


// --- 💡 2. p5.js 핵심 함수 (preload, setup, draw) ---

/** 사운드 파일을 미리 로드합니다. */
function preload() {
    try {
        // 띡 소리 (연필) - Do1.mp3
        do1Sound = loadSound('audio/Do1.mp3');
        // 드르륵 소리 (사각형) - Do1.mp3
        dragSound = loadSound('audio/Do1.mp3');
    } catch (e) {
        console.warn("오디오 파일을 로드할 수 없습니다. 'audio/' 폴더에 Do1.mp3 파일이 있는지 확인하세요.", e);
    }
}

function setup() {
    // 캔버스 크기 계산 (화면의 90% 크기, 정사각형)
    let canvasDim = min(windowWidth, windowHeight) * 0.9;
    pixelSize = canvasDim / canvasSize; // 픽셀 1개의 실제 크기
    createCanvas(canvasDim, canvasDim);

    // --- 💡 사운드 볼륨 설정 ---
    if (do1Sound) do1Sound.setVolume(0.5);
    if (dragSound) dragSound.setVolume(0.5);
    // ---------------------------

    // 캔버스 데이터 초기화 (16x16 2D 배열 생성)
    gridData = Array(canvasSize).fill(null).map(() => Array(canvasSize).fill(null));
    
    // 기본 색상 설정
    currentColor = color(0); // 검은색
    
    // 캔버스를 흰색(기본 배경색)으로 초기화
    let white = color(255);
    for (let c = 0; c < canvasSize; c++) {
        for (let r = 0; r < canvasSize; r++) {
            gridData[c][r] = white;
        }
    }

    // --- UI 생성 ---
    let btnY = height + 10;
    let inputY = height + 40;
    let currentX = 10;
    
    btnPencil = createButton('✏️ 연필');
    btnPencil.position(currentX, btnY);
    btnPencil.mousePressed(() => { currentTool = 'pencil'; updateUI(); });
    currentX += btnPencil.width + 10;

    btnRect = createButton('⬜ 사각형');
    btnRect.position(currentX, btnY);
    btnRect.mousePressed(() => { currentTool = 'rectangle'; updateUI(); });
    currentX += btnRect.width + 20;

    btnBlack = createButton('⬛ 검은색');
    btnBlack.position(currentX, btnY);
    btnBlack.mousePressed(() => { currentColor = color(0); updateUI(); });
    currentX += btnBlack.width + 10;

    btnWhite = createButton('⬜ 흰색 (지우개)');
    btnWhite.position(currentX, btnY);
    btnWhite.mousePressed(() => { currentColor = color(255); updateUI(); });
    currentX += btnWhite.width + 20;

    btnSavePNG = createButton('Save PNG');
    btnSavePNG.position(currentX, btnY);
    btnSavePNG.mousePressed(() => { savePNG(); });
    currentX += btnSavePNG.width + 10;

    // 💡 불러오기 버튼 추가
    inputLoadPNG = createFileInput(handleFileLoad);
    inputLoadPNG.position(currentX, btnY);
    
    // 저장 파일명 입력
    inputFileName = createInput('pixel-art.png');
    inputFileName.size(140);
    inputFileName.position(10, inputY);

    // 안내 텍스트: '저장명'을 입력칸 옆에 표시
    labelSaveName = createSpan('저장명을 입력하세요. png 확장자는 자동으로 추가됩니다.');
    labelSaveName.style('font-size', '14px');
    if (inputFileName) {
        labelSaveName.position(10 + inputFileName.width + 10, inputY + 4);
    } else {
        labelSaveName.position(160, inputY + 4);
    }

    updateUI(); // 버튼 활성 상태 초기화
}

function draw() {
    background(120); // 캔버스 바깥쪽 회색 배경
    drawPixelGrid();
    drawPreview();
}


// --- 3. 마우스/터치 입력 함수 (생략, 기존과 동일) ---

function mousePressed() {
    if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
        return;
    }
    isDrawing = true;
    let { col, row } = mouseToGridCoords(mouseX, mouseY);
    if (col === null) return;
    startCol = col;
    startRow = row;

    if (currentTool === 'pencil') {
        drawPixel(col, row, currentColor);
        lastCol = col;
        lastRow = row;
    }
}

function mouseDragged() {
    if (!isDrawing) return;

    let { col, row } = mouseToGridCoords(mouseX, mouseY);
    if (col === null) return;

    if (currentTool === 'pencil') {
        // 연필 '선' 그리기
        if (col !== lastCol || row !== lastRow) {
            drawLine(lastCol, lastRow, col, row, currentColor);
            lastCol = col;
            lastRow = row;
        }
    } else if (currentTool === 'rectangle') {
        // --- 💡 사각형 도구 '드르륵' 사운드 ---
        let w = Math.abs(col - startCol) + 1;
        let h = Math.abs(row - startRow) + 1;

        // 스냅된 크기가 변경될 때만 사운드 재생
        if (dragSound && dragSound.isLoaded() && (w !== lastSnapW || h !== lastSnapH)) {
            let area = Math.max(1, w * h);
            let maxArea = canvasSize * canvasSize;
            // 로그 스케일로 정규화 (소리 변화를 더 잘 느낌)
            let norm = Math.log(area) / Math.log(maxArea);
            norm = constrain(norm, 0, 1);
            
            let pitch = lerp(0.5, 2.0, norm); // 0.5배속 ~ 2배속
            dragSound.rate(pitch);
            dragSound.play();
            
            lastSnapW = w;
            lastSnapH = h;
        }
        // ------------------------------------
    }
}

function mouseReleased() {
    if (!isDrawing) return;
    isDrawing = false;

    let { col, row } = mouseToGridCoords(mouseX, mouseY);
    if (col === null) {
        col = constrain(floor(mouseX / pixelSize), 0, canvasSize - 1);
        row = constrain(floor(mouseY / pixelSize), 0, canvasSize - 1);
    }

    if (currentTool === 'rectangle') {
        drawRectangle(startCol, startRow, col, row, currentColor);
    }

    // --- 💡 사운드 상태 초기화 ---
    lastSnapW = null;
    lastSnapH = null;
    // -------------------------
}

// 창 크기 변경 시 UI 위치 재조정
function windowResized() {
    let canvasDim = min(windowWidth, windowHeight) * 0.9;
    pixelSize = canvasDim / canvasSize;
    resizeCanvas(canvasDim, canvasDim);
    
    let btnY = height + 10;
    let inputY = height + 40;
    let currentX = 10;
    
    btnPencil.position(currentX, btnY);
    currentX += btnPencil.width + 10;
    
    btnRect.position(currentX, btnY);
    currentX += btnRect.width + 20;
    
    btnBlack.position(currentX, btnY);
    currentX += btnBlack.width + 10;
    
    btnWhite.position(currentX, btnY);
    currentX += btnWhite.width + 20;

    if (btnSavePNG) btnSavePNG.position(currentX, btnY);
    currentX += btnSavePNG.width + 10;
    
    // 💡 불러오기 버튼 위치 재조정
    if (inputLoadPNG) inputLoadPNG.position(currentX, btnY);
    
    if (inputFileName) inputFileName.position(10, inputY);
    if (labelSaveName) labelSaveName.position(10 + (inputFileName.width || 140) + 10, inputY + 4);
}

// (savePNG, sanitizeFileName 함수는 기존과 동일)
// --- 
function savePNG() {
    const scale = 1; // 업스케일 없이 원본 32x32 픽셀로 저장
    const outSize = canvasSize * scale;
    const off = document.createElement('canvas');
    off.width = outSize;
    off.height = outSize;
    const ctx = off.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outSize, outSize);
    for (let c = 0; c < canvasSize; c++) {
        for (let r = 0; r < canvasSize; r++) {
            const col = gridData[c][r];
            const rr = typeof red === 'function' ? red(col) : 0;
            const gg = typeof green === 'function' ? green(col) : 0;
            const bb = typeof blue === 'function' ? blue(col) : 0;
            const aa = typeof alpha === 'function' ? alpha(col) : 255;
            ctx.fillStyle = `rgba(${rr}, ${gg}, ${bb}, ${aa / 255})`;
            ctx.fillRect(c * scale, r * scale, scale, scale);
        }
    }
    let desiredName = 'pixel-art.png';
    if (inputFileName && typeof inputFileName.value === 'function') {
        desiredName = inputFileName.value().trim() || desiredName;
    } else if (inputFileName && typeof inputFileName.value === 'string') {
        desiredName = inputFileName.value.trim() || desiredName;
    }
    desiredName = sanitizeFileName(desiredName);
    if (off.toBlob) {
        off.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = desiredName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    } else {
        try {
            const dataURL = off.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = desiredName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            console.error('Failed to export PNG:', e);
        }
    }
}
function sanitizeFileName(name) {
    let ext = '';
    const lastDot = name.lastIndexOf('.');
    if (lastDot !== -1) {
        ext = name.slice(lastDot + 1).toLowerCase();
        name = name.slice(0, lastDot);
    }
    name = name.replace(/[\\/:*?"<>|]+/g, '');
    name = name.replace(/\s+/g, '-');
    if (!ext) ext = 'png';
    if (ext !== 'png') ext = 'png';
    return `${name}.${ext}`;
}
// --- 


// --- 💡 6. PNG 불러오기 헬퍼 함수 추가 ---

/** 1. 파일 업로드를 처리하는 메인 핸들러 */
function handleFileLoad(file) {
    // 파일 타입이 이미지인지 확인
    if (file.type === 'image') {
        // p5.js의 loadImage를 사용하여 이미지 데이터를 로드
        loadImage(file.data, onImageLoaded);
    } else {
        alert('이것은 이미지 파일이 아닙니다. (jpg, png 등)');
    }
}

/** 2. 이미지 로드가 완료되었을 때 실행되는 핵심 함수 */
function onImageLoaded(img) {
    const expectedSize = canvasSize; // 현재 설정된 캔버스 크기는 16

    // 로드된 이미지 크기 검증 (16x16 픽셀이 아니면 오류)
    if (img.width !== expectedSize || img.height !== expectedSize) {
        alert(`[오류] 잘못된 파일입니다!\n\n현재 설정(${expectedSize}x${expectedSize})에 맞는 픽셀 크기의 이미지가 필요합니다.`);
        return;
    }

    img.loadPixels(); // 이미지 픽셀 데이터 접근 준비

    // 이미지의 픽셀 데이터를 gridData 배열에 복사
    for (let c = 0; c < canvasSize; c++) {
        for (let r = 0; r < canvasSize; r++) {
            // 이미지 픽셀 배열에서의 인덱스 계산 (y * width + x) * 4
            let x = c;
            let y = r;
            let index = (y * img.width + x) * 4;
            
            // RGBA 값 추출
            let r_val = img.pixels[index];
            let g_val = img.pixels[index + 1];
            let b_val = img.pixels[index + 2];
            let a_val = img.pixels[index + 3];
            
            // p5.Color 객체 생성 및 gridData에 저장
            let pixelColor = color(r_val, g_val, b_val, a_val);
            gridData[c][r] = pixelColor;
        }
    }
    
    alert('이미지를 성공적으로 불러왔습니다!');
}
// ------------------------------------------

// --- 4. 그리기 헬퍼 함수 (생략, 기존과 동일) ---

function drawPixelGrid() {
    noStroke();
    for (let c = 0; c < canvasSize; c++) {
        for (let r = 0; r < canvasSize; r++) {
            fill(gridData[c][r]);
            rect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
        }
    }
    stroke(180);
    strokeWeight(1);
    for (let c = 0; c <= canvasSize; c++) {
        line(c * pixelSize, 0, c * pixelSize, height);
    }
    for (let r = 0; r <= canvasSize; r++) {
        line(0, r * pixelSize, width, r * pixelSize);
    }
}

function drawPreview() {
    let { col, row } = mouseToGridCoords(mouseX, mouseY);
    if (col === null) return;
    push();
    if (isDrawing && currentTool === 'rectangle') {
        noFill();
        stroke(255, 0, 0);
        strokeWeight(2);
        let x1 = min(startCol, col) * pixelSize;
        let y1 = min(startRow, row) * pixelSize;
        let x2 = (max(startCol, col) + 1) * pixelSize;
        let y2 = (max(startRow, row) + 1) * pixelSize;
        rectMode(CORNERS);
        rect(x1, y1, x2, y2);
    } else if (!isDrawing) {
        fill(currentColor);
        stroke(100);
        strokeWeight(1);
        let previewColor = color(red(currentColor), green(currentColor), blue(currentColor), 150);
        fill(previewColor);
        rect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
    }
    pop();
}

/** [핵심] gridData에 픽셀 1개를 그립니다. */
function drawPixel(col, row, c) {
    if (col < 0 || col >= canvasSize || row < 0 || row >= canvasSize) {
        return;
    }
    if (gridData[col][row].toString() === c.toString()) {
        return;
    }
    gridData[col][row] = c;

    // --- 💡 픽셀 '띡' 사운드 재생 헬퍼 ---
    playTickSound();
    // -----------------------------
}

/** [핵심] gridData에 사각형을 그립니다. */
function drawRectangle(c1, r1, c2, r2, c) {
    let minC = min(c1, c2);
    let maxC = max(c1, c2);
    let minR = min(r1, r2);
    let maxR = max(r1, r2);

    for (let col = minC; col <= maxC; col++) {
        for (let row = minR; row <= maxR; row++) {
            if (col >= 0 && col < canvasSize && row >= 0 && row < canvasSize) {
                // drawPixel을 호출하지 않고 직접 데이터를 변경
                // (사각형은 한 번에 그려지므로 '띡' 소리가 반복되지 않게 함)
                gridData[col][row] = c;
            }
        }
    }
}

/** [핵심] Bresenham's line algorithm을 이용해 두 점 사이의 픽셀을 채웁니다. */
function drawLine(x0, y0, x1, y1, c) {
    let dx = Math.abs(x1 - x0);
    let dy = -Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    while (true) {
        drawPixel(x0, y0, c); // '띡' 소리는 drawPixel 내부에서 처리
        if (x0 === x1 && y0 === y1) break;
        let e2 = 2 * err;
        if (e2 >= dy) {
            err += dy;
            x0 += sx;
        }
        if (e2 <= dx) {
            err += dx;
            y0 += sy;
        }
    }
}


// --- 5. 유틸리티 함수 (생략, 기존과 동일) ---

// --- 💡 '띡' 사운드 재생 헬퍼 ---
/** 연필 '띡' 소리를 재생합니다. (Do1.mp3 사용) */
function playTickSound() {
    if (do1Sound && do1Sound.isLoaded()) {
        do1Sound.rate(2.5); // 음높이 높게
        do1Sound.setVolume(0.3); // 볼륨 작게
        do1Sound.play();
    }
}
// ---------------------------------

/** 마우스 좌표(px)를 그리드 좌표(col, row)로 변환합니다. (스냅 기능) */
function mouseToGridCoords(mx, my) {
    let col = floor(mx / pixelSize);
    let row = floor(my / pixelSize);

    if (col < 0 || col >= canvasSize || row < 0 || row >= canvasSize) {
        return { col: null, row: null };
    }
    return { col, row };
}

/** UI 버튼의 활성/비활성 상태를 시각적으로 업데이트합니다. */
function updateUI() {
    btnPencil.style('background-color', currentTool === 'pencil' ? '#aaa' : '#fff');
    btnRect.style('background-color', currentTool === 'rectangle' ? '#aaa' : '#fff');
    btnBlack.style('background-color', red(currentColor) === 0 ? '#aaa' : '#fff');
    btnWhite.style('background-color', red(currentColor) === 255 ? '#aaa' : '#fff');
}