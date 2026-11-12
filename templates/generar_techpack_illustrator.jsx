// ============================================================================
// GENERADOR DE PLANTILLA TECH PACK (TAMAÑO CARTA: 612 x 792 pt / 8.5 x 11 in)
// Optimizado para lectura automática en APP FICHAS (AG LAB / AZZORTI)
// ============================================================================

#target illustrator

(function () {
    var W = 612; // 8.5 in (215.9 mm)
    var H = 792; // 11.0 in (279.4 mm)

    // Helper: Convierte coordenada Y desde arriba (top-down) al sistema de Illustrator
    function Y(yTop) {
        return H - yTop;
    }

    function rgb(r, g, b) {
        var c = new RGBColor();
        c.red = r;
        c.green = g;
        c.blue = b;
        return c;
    }

    var C_BLACK   = rgb(17, 17, 17);
    var C_WHITE   = rgb(255, 255, 255);
    var C_GRAY_BG = rgb(250, 250, 250);
    var C_GRID    = rgb(235, 235, 235);
    var C_MUTED   = rgb(100, 100, 100);
    var C_RED     = rgb(210, 38, 38);
    var C_CYAN    = rgb(0, 168, 232);
    var C_CORAL   = rgb(242, 100, 90);
    var C_YELLOW  = rgb(245, 212, 38);

    // Crear documento Tamaño Carta en RGB
    var preset = new DocumentPreset();
    preset.title = "PLANTILLA_TECHPACK_ARTE_CARTA";
    preset.width = W;
    preset.height = H;
    preset.units = RulerUnits.Centimeters;
    preset.colorMode = DocumentColorSpace.RGB;

    var doc = app.documents.addDocument(DocumentColorSpace.RGB, preset);
    doc.artboards[0].artboardRect = [0, H, W, 0];
    doc.artboards[0].name = "TECHPACK_CARTA";

    // Selección de fuentes seguras
    function getFont(bold) {
        var candidates = bold
            ? ["Arial-BoldMT", "Helvetica-Bold", "HelveticaNeue-Bold", "MyriadPro-Bold"]
            : ["ArialMT", "Helvetica", "HelveticaNeue", "MyriadPro-Regular"];
        for (var i = 0; i < candidates.length; i++) {
            try {
                return app.textFonts.getByName(candidates[i]);
            } catch (e) {}
        }
        return app.textFonts[0];
    }

    var FONT_BOLD = getFont(true);
    var FONT_REG  = getFont(false);

    // Crear Capas organizadas (de abajo hacia arriba)
    var baseLayer = doc.layers[0];
    baseLayer.name = "1_CUADRICULA_FONDO";

    var layerGrid   = baseLayer;
    var layerStruct = doc.layers.add(); layerStruct.name = "2_ESTRUCTURA_BORDES";
    var layerLabels = doc.layers.add(); layerLabels.name = "3_ETIQUETAS_FIJAS";
    var layerVisual = doc.layers.add(); layerVisual.name = "4_ZONAS_IMAGEN_Y_COLOR";
    var layerData   = doc.layers.add(); layerData.name   = "5_DATOS_EDITABLES_APP";

    // Helpers de dibujo
    function drawRect(layer, x, yTop, w, h, fillCol, strokeCol, strokeW, name) {
        var r = layer.pathItems.rectangle(Y(yTop), x, w, h);
        if (fillCol) {
            r.filled = true;
            r.fillColor = fillCol;
        } else {
            r.filled = false;
        }
        if (strokeCol) {
            r.stroked = true;
            r.strokeColor = strokeCol;
            r.strokeWidth = strokeW || 1;
        } else {
            r.stroked = false;
        }
        if (name) r.name = name;
        return r;
    }

    function drawRoundRect(layer, x, yTop, w, h, rad, fillCol, strokeCol, strokeW, name) {
        var rr = layer.pathItems.roundedRectangle(Y(yTop), x, w, h, rad, rad);
        if (fillCol) {
            rr.filled = true;
            rr.fillColor = fillCol;
        } else {
            rr.filled = false;
        }
        if (strokeCol) {
            rr.stroked = true;
            rr.strokeColor = strokeCol;
            rr.strokeWidth = strokeW || 1;
        } else {
            rr.stroked = false;
        }
        if (name) rr.name = name;
        return rr;
    }

    function drawLine(layer, x1, yTop1, x2, yTop2, strokeCol, strokeW, name) {
        var line = layer.pathItems.add();
        line.setEntirePath([[x1, Y(yTop1)], [x2, Y(yTop2)]]);
        line.filled = false;
        line.stroked = true;
        line.strokeColor = strokeCol;
        line.strokeWidth = strokeW || 1;
        if (name) line.name = name;
        return line;
    }

    function addText(layer, textStr, x, yTop, size, isBold, color, name) {
        var tf = layer.textFrames.add();
        tf.contents = textStr;
        tf.position = [x, Y(yTop)];
        var tr = tf.textRange;
        tr.characterAttributes.size = size;
        tr.characterAttributes.textFont = isBold ? FONT_BOLD : FONT_REG;
        tr.characterAttributes.fillColor = color || C_BLACK;
        if (name) tf.name = name;
        return tf;
    }

    // ========================================================================
    // 1. CAPA CUADRÍCULA DE FONDO
    // ========================================================================
    drawRect(layerGrid, 0, 0, W, H, C_WHITE, null, 0, "FONDO_HOJA_CARTA");
    var gridStep = 18;
    for (var gx = 18; gx < W; gx += gridStep) {
        drawLine(layerGrid, gx, 0, gx, H, C_GRID, 0.4);
    }
    for (var gy = 18; gy < H; gy += gridStep) {
        drawLine(layerGrid, 0, gy, W, gy, C_GRID, 0.4);
    }

    // ========================================================================
    // 2. CABEZOTE SUPERIOR (SOLO DATOS TÉCNICOS DEL ARTE)
    // ========================================================================
    var margin = 24;
    // Pill "FICHA TÉCNICA - ARTE"
    drawRoundRect(layerLabels, margin, 38, 190, 26, 13, C_BLACK, null, 0, "BADGE_TITULO");
    addText(layerLabels, "FICHA TÉCNICA - ARTE", margin + 15, 45, 13, true, C_WHITE);

    // Tabla de 3 columnas x 3 filas a la derecha
    var tblX = 226;
    var tblY = 22;
    var tblW = W - margin - tblX; // 362 pt
    var tblH = 66;
    var colW = [134, 128, 100]; // Suma = 362 pt
    var rowH = tblH / 3; // 22 pt

    drawRect(layerStruct, tblX, tblY, tblW, tblH, C_WHITE, C_BLACK, 1.3, "TABLA_CABEZOTE");
    // Líneas horizontales
    drawLine(layerStruct, tblX, tblY + rowH, tblX + tblW, tblY + rowH, C_BLACK, 1);
    drawLine(layerStruct, tblX, tblY + rowH * 2, tblX + tblW, tblY + rowH * 2, C_BLACK, 1);
    // Líneas verticales
    drawLine(layerStruct, tblX + colW[0], tblY, tblX + colW[0], tblY + tblH, C_BLACK, 1);
    drawLine(layerStruct, tblX + colW[0] + colW[1], tblY, tblX + colW[0] + colW[1], tblY + tblH, C_BLACK, 1);

    var headerData = [
        [
            { lbl: "REFERENCIA:", val: "REF-2026-089", key: "CAMPO_REFERENCIA" },
            { lbl: "PROCESO:",    val: "ESTAMPACIÓN",  key: "CAMPO_PROCESO" },
            { lbl: "PIEZA:",      val: "DELANTERO",    key: "CAMPO_PIEZA" }
        ],
        [
            { lbl: "TELA BASE:",  val: "JERSEY ALGODÓN",   key: "CAMPO_TELA_BASE" },
            { lbl: "TIPO LOGO:",  val: "PECHO / ESPALDA",  key: "CAMPO_TIPO_LOGO" },
            { lbl: "# PIEZAS:",   val: "1",                key: "CAMPO_NUM_PIEZAS" }
        ],
        [
            { lbl: "# ESTAMPADOS:", val: "1",  key: "CAMPO_NUM_ESTAMPADOS" },
            { lbl: "FOIL:",         val: "NO", key: "CAMPO_FOIL" },
            { lbl: "ALTA DENSI.:",  val: "SI", key: "CAMPO_ALTA_DENSI" }
        ]
    ];

    for (var r = 0; r < 3; r++) {
        var curX = tblX;
        var curY = tblY + r * rowH;
        for (var c = 0; c < 3; c++) {
            var item = headerData[r][c];
            var lblTf = addText(layerLabels, item.lbl, curX + 5, curY + 6, 7.2, true, C_BLACK, "LBL_" + item.key);
            var lblWidth = lblTf.width;
            addText(layerData, item.val, curX + 5 + lblWidth + 3, curY + 6, 7.2, false, C_BLACK, item.key);
            curX += colW[c];
        }
    }

    // ========================================================================
    // 3. BLOQUE 1: ROPERO CAD 2D (Izquierda Arriba)
    // ========================================================================
    var b1X = margin;
    var b1Y = 102;
    var b1W = 304;
    var b1H = 248;

    drawRoundRect(layerStruct, b1X, b1Y, b1W, b1H, 8, null, C_BLACK, 1.4, "CAJA_1_ROPERO");
    drawLine(layerStruct, b1X, b1Y + 18, b1X + b1W, b1Y + 18, C_BLACK, 1.1);
    drawRoundRect(layerLabels, b1X + 10, b1Y + 6, 150, 22, 11, C_BLACK, null, 0);
    addText(layerLabels, "1. ROPERO CAD 2D", b1X + 22, b1Y + 11, 10, true, C_WHITE);

    // Marco interno de recorte para la App (img_ropero_cad)
    drawRect(layerVisual, b1X + 8, b1Y + 34, b1W - 16, b1H - 42, null, C_GRID, 0.5, "ZONA_ROPERO_CAD");

    // Dibujo vectorial de ejemplo: Camiseta Delantero y Posterior
    function drawTShirt(layer, cx, cyTop, isBack) {
        var s = 0.58;
        var pts = [
            [cx - 42*s, Y(cyTop - 85*s)],
            [cx + 42*s, Y(cyTop - 85*s)],
            [cx + 102*s, Y(cyTop - 25*s)],
            [cx + 76*s, Y(cyTop - 2*s)],
            [cx + 58*s, Y(cyTop - 24*s)],
            [cx + 58*s, Y(cyTop + 98*s)],
            [cx - 58*s, Y(cyTop + 98*s)],
            [cx - 58*s, Y(cyTop - 24*s)],
            [cx - 76*s, Y(cyTop - 2*s)],
            [cx - 102*s, Y(cyTop - 25*s)]
        ];
        var poly = layer.pathItems.add();
        poly.setEntirePath(pts);
        poly.closed = true;
        poly.filled = true;
        poly.fillColor = C_BLACK;
        poly.stroked = true;
        poly.strokeColor = C_BLACK;
        poly.strokeWidth = 1;

        if (!isBack) {
            drawRect(layer, cx + 10*s, cyTop - 42*s, 28*s, 28*s, null, C_WHITE, 0.8);
            addText(layer, "ARTE", cx + 12*s, cyTop - 32*s, 5.5, true, C_WHITE);
        } else {
            drawRect(layer, cx - 30*s, cyTop - 48*s, 60*s, 62*s, null, C_WHITE, 1);
            addText(layer, "ARTE", cx - 14*s, cyTop - 22*s, 8, true, C_WHITE);
        }
    }

    drawTShirt(layerVisual, b1X + 86, b1Y + 140, false);
    drawTShirt(layerVisual, b1X + 220, b1Y + 140, true);
    addText(layerLabels, "DELANTERO", b1X + 58, b1Y + 216, 8.5, true, C_BLACK);
    addText(layerLabels, "POSTERIOR", b1X + 194, b1Y + 216, 8.5, true, C_BLACK);

    // ========================================================================
    // 4. BLOQUE 2: PANTALLAZO MOLDE (Izquierda Abajo)
    // ========================================================================
    var b2X = margin;
    var b2Y = 362;
    var b2W = 304;
    var b2H = 302;

    drawRoundRect(layerStruct, b2X, b2Y, b2W, b2H, 8, null, C_BLACK, 1.4, "CAJA_2_MOLDE");
    drawLine(layerStruct, b2X, b2Y + 18, b2X + b2W, b2Y + 18, C_BLACK, 1.1);
    drawRoundRect(layerLabels, b2X + 10, b2Y + 6, 174, 22, 11, C_BLACK, null, 0);
    addText(layerLabels, "2. PANTALLAZO MOLDE", b2X + 22, b2Y + 11, 10, true, C_WHITE);

    // Marco interno de recorte para la App (img_pantallazo_molde)
    drawRect(layerVisual, b2X + 8, b2Y + 34, b2W - 16, b2H - 42, null, C_GRID, 0.5, "ZONA_PANTALLAZO_MOLDE");

    // Silueta de Molde + cota de 7.5 cm desde escote
    var mcx = b2X + 146;
    var mcy = b2Y + 168;
    var moldePts = [
        [mcx - 74, Y(mcy - 102)],
        [mcx - 32, Y(mcy - 112)],
        [mcx - 20, Y(mcy - 82)],
        [mcx + 20, Y(mcy - 82)],
        [mcx + 32, Y(mcy - 112)],
        [mcx + 74, Y(mcy - 102)],
        [mcx + 62, Y(mcy - 36)],
        [mcx + 84, Y(mcy - 18)],
        [mcx + 80, Y(mcy + 112)],
        [mcx - 80, Y(mcy + 112)],
        [mcx - 84, Y(mcy - 18)],
        [mcx - 62, Y(mcy - 36)]
    ];
    var moldePath = layerVisual.pathItems.add();
    moldePath.setEntirePath(moldePts);
    moldePath.closed = true;
    moldePath.filled = true;
    moldePath.fillColor = C_WHITE;
    moldePath.stroked = true;
    moldePath.strokeColor = C_BLACK;
    moldePath.strokeWidth = 1.2;
    moldePath.name = "SILUETA_MOLDE_EJEMPLO";

    // Línea de hilo (Center grainline)
    drawLine(layerVisual, mcx, mcy - 80, mcx, mcy + 108, C_BLACK, 0.7);
    // Cota roja desde escote (7.5 cm)
    drawLine(layerVisual, mcx + 20, mcy - 82, mcx + 92, mcy - 82, C_RED, 0.8);
    drawLine(layerVisual, mcx + 20, mcy - 48, mcx + 92, mcy - 48, C_RED, 0.8);
    drawLine(layerVisual, mcx + 86, mcy - 82, mcx + 86, mcy - 48, C_RED, 1);
    addText(layerVisual, "7.5 cm", mcx + 92, mcy - 72, 7.5, true, C_RED);
    addText(layerVisual, "desde escote", mcx + 92, mcy - 62, 7, false, C_RED);

    // Arte posicionado en el molde
    drawRect(layerVisual, mcx + 14, mcy - 48, 36, 40, C_GRAY_BG, C_BLACK, 0.9, "ARTE_EN_MOLDE");
    addText(layerVisual, "ARTE", mcx + 22, mcy - 32, 7, true, C_BLACK);

    // ========================================================================
    // 5. BLOQUE 3: ARTE AISLADO (100%) + MEDIDAS + % CUBRIMIENTO (Derecha Arriba)
    // ========================================================================
    var b3X = 340;
    var b3Y = 102;
    var b3W = W - margin - b3X; // 248 pt
    var b3H = 352;

    drawRoundRect(layerStruct, b3X, b3Y, b3W, b3H, 8, null, C_BLACK, 1.4, "CAJA_3_ARTE_AISLADO");
    drawLine(layerStruct, b3X, b3Y + 18, b3X + b3W, b3Y + 18, C_BLACK, 1.1);
    drawRoundRect(layerLabels, b3X + 10, b3Y + 6, 184, 22, 11, C_BLACK, null, 0);
    addText(layerLabels, "3. ARTE AISLADO (100%)", b3X + 20, b3Y + 11, 10, true, C_WHITE);

    // Recuadro exacto para el Arte Aislado (La App recorta ZONA_ARTE_AISLADO para % cubrimiento)
    var artX = b3X + 36;
    var artY = b3Y + 52;
    var artW = 160;
    var artH = 172;
    drawRect(layerVisual, artX, artY, artW, artH, C_WHITE, C_BLACK, 1.2, "ZONA_ARTE_AISLADO");
    addText(layerVisual, "COLOCA EL ARTE AQUÍ", artX + 24, artY + 75, 9.5, true, C_MUTED, "PLACEHOLDER_ARTE");
    addText(layerVisual, "(Cálculo automático de % Cubrimiento)", artX + 18, artY + 90, 7, false, C_MUTED);

    // Línea de llamada roja entre Ropero y Arte Aislado
    drawLine(layerStruct, b1X + 260, b1Y + 148, artX - 6, artY + 86, C_RED, 0.9);

    // Cotas rojas de Alto y Ancho junto al cuadro de Arte Aislado
    var cotaRightX = artX + artW + 10;
    drawLine(layerLabels, cotaRightX - 4, artY, cotaRightX + 4, artY, C_RED, 1);
    drawLine(layerLabels, cotaRightX - 4, artY + artH, cotaRightX + 4, artY + artH, C_RED, 1);
    drawLine(layerLabels, cotaRightX, artY, cotaRightX, artY + artH, C_RED, 1);
    addText(layerLabels, "ALTO (cm)", cotaRightX + 5, artY + 78, 7, true, C_RED);

    var cotaBotY = artY + artH + 10;
    drawLine(layerLabels, artX, cotaBotY - 4, artX, cotaBotY + 4, C_RED, 1);
    drawLine(layerLabels, artX + artW, cotaBotY - 4, artX + artW, cotaBotY + 4, C_RED, 1);
    drawLine(layerLabels, artX, cotaBotY, artX + artW, cotaBotY, C_RED, 1);
    addText(layerLabels, "ANCHO (cm)", artX + 56, cotaBotY + 5, 7.5, true, C_RED);

    // Mini-tabla inferior de Medidas y % Cubrimiento dentro del Bloque 3
    var mtX = b3X + 20;
    var mtY = b3Y + 280;
    var mtW = b3W - 40; // 208 pt
    var mtH = 42;
    var mtColW = mtW / 3;

    drawRect(layerStruct, mtX, mtY, mtW, mtH, C_WHITE, C_BLACK, 1.1, "TABLA_MEDIDAS_CUBRIMIENTO");
    drawLine(layerStruct, mtX, mtY + 20, mtX + mtW, mtY + 20, C_BLACK, 1);
    drawLine(layerStruct, mtX + mtColW, mtY, mtX + mtColW, mtY + mtH, C_BLACK, 1);
    drawLine(layerStruct, mtX + mtColW * 2, mtY, mtX + mtColW * 2, mtY + mtH, C_BLACK, 1);

    addText(layerLabels, "ANCHO (CM):",    mtX + 8,              mtY + 6, 7.2, true, C_BLACK);
    addText(layerLabels, "ALTO (CM):",     mtX + mtColW + 12,    mtY + 6, 7.2, true, C_BLACK);
    addText(layerLabels, "% CUBRIMIENTO:", mtX + mtColW * 2 + 4, mtY + 6, 6.8, true, C_BLACK);

    addText(layerData, "24",  mtX + 26,              mtY + 25, 9, true, C_BLACK, "CAMPO_ANCHO_CM");
    addText(layerData, "28",  mtX + mtColW + 26,     mtY + 25, 9, true, C_BLACK, "CAMPO_ALTO_CM");
    addText(layerData, "35%", mtX + mtColW * 2 + 22, mtY + 25, 9, true, C_BLACK, "CAMPO_PORC_CUBRIMIENTO");

    // ========================================================================
    // 6. BLOQUE 4: OBSERVACIONES TÉCNICAS (Derecha Abajo)
    // ========================================================================
    var b4X = 340;
    var b4Y = 466;
    var b4W = W - margin - b4X; // 248 pt
    var b4H = 198;

    drawRoundRect(layerStruct, b4X, b4Y, b4W, b4H, 8, null, C_BLACK, 1.4, "CAJA_4_OBSERVACIONES");
    drawLine(layerStruct, b4X, b4Y + 18, b4X + b4W, b4Y + 18, C_BLACK, 1.1);
    drawRoundRect(layerLabels, b4X + 10, b4Y + 6, 205, 22, 11, C_BLACK, null, 0);
    addText(layerLabels, "4. OBSERVACIONES TÉCNICAS", b4X + 20, b4Y + 11, 10, true, C_WHITE);

    var obsText = "• Tacto suave / verificar registro de alta densidad.\r" +
                  "• Ubicación a 7.5 cm desde el escote delantero.\r" +
                  "• Temperatura de curado estándar 160°C.\r" +
                  "• No planchar directamente sobre el estampado.";
    addText(layerData, obsText, b4X + 14, b4Y + 42, 8.2, false, C_BLACK, "CAMPO_OBSERVACIONES");

    // ========================================================================
    // 7. BLOQUE 5: ARMONÍA DE COLOR / PANTONES (Barra Inferior)
    // ========================================================================
    var b5X = margin;
    var b5Y = 678;
    var b5W = W - margin * 2; // 564 pt
    var b5H = 92;

    drawRoundRect(layerStruct, b5X, b5Y, b5W, b5H, 8, null, C_BLACK, 1.4, "CAJA_5_COLORES");
    drawLine(layerStruct, b5X, b5Y + 16, b5X + b5W, b5Y + 16, C_BLACK, 1.1);
    drawRoundRect(layerLabels, b5X + 10, b5Y + 4, 240, 22, 11, C_BLACK, null, 0);
    addText(layerLabels, "5. ARMONÍA DE COLOR / PANTONES", b5X + 20, b5Y + 9, 10, true, C_WHITE);

    var swatches = [
        { col: C_BLACK,  mat: "PLASTISOL", pms: "19-4007 TCX", nom: "BLACK" },
        { col: C_CYAN,   mat: "PLASTISOL", pms: "15-4722 TCX", nom: "CYAN BLUE" },
        { col: C_WHITE,  mat: "PLASTISOL", pms: "11-0601 TCX", nom: "WHITE" },
        { col: C_CORAL,  mat: "PLASTISOL", pms: "17-1753 TCX", nom: "CORAL RED" },
        { col: C_YELLOW, mat: "PLASTISOL", pms: "13-0858 TCX", nom: "YELLOW" }
    ];

    var numCards = 5;
    var cardGap = 6;
    var cardsStartX = b5X + 10;
    var cardsAvailW = b5W - 20;
    var cardW = (cardsAvailW - cardGap * (numCards - 1)) / numCards; // ~104 pt
    var cardH = 52;
    var cardY = b5Y + 32;

    for (var i = 0; i < numCards; i++) {
        var cx = cardsStartX + i * (cardW + cardGap);
        var idx = i + 1;
        var sw = swatches[i];

        // Tarjeta contenedora
        drawRect(layerStruct, cx, cardY, cardW, cardH, C_WHITE, C_BLACK, 1, "TARJETA_COLOR_" + idx);
        // Cuadro de muestra de color a la izquierda
        var sqSize = 42;
        drawRect(layerVisual, cx + 4, cardY + 5, sqSize, sqSize, sw.col, C_BLACK, 0.9, "MUESTRA_COLOR_" + idx);

        // Textos a la derecha del cuadro
        var tx = cx + sqSize + 8;
        addText(layerLabels, "MATERIAL:", tx, cardY + 4,  5.5, true, C_MUTED);
        addText(layerData,   sw.mat,      tx, cardY + 11, 6.2, true, C_BLACK, "COLOR_" + idx + "_MAT");

        addText(layerLabels, "PANTONE:",  tx, cardY + 21, 5.5, true, C_MUTED);
        addText(layerData,   sw.pms,      tx, cardY + 28, 6.0, true, C_BLACK, "COLOR_" + idx + "_PMS");

        addText(layerData,   sw.nom,      tx, cardY + 39, 6.2, true, C_BLACK, "COLOR_" + idx + "_NOM");
    }

    // Bloquear capas de fondo y estructura para que el diseñador trabaje cómodo
    layerGrid.locked = true;
    layerStruct.locked = true;
    layerLabels.locked = true;

    // Guardar como .ai con compatibilidad PDF en la carpeta templates del proyecto
    var outPath = "/Users/danieldiaz/AG LAB S.A.S Dropbox/Dropbox Mixto/AZZORTI/DISEÑO MODA DUPREE/DANI DIAZ/ENSAYO PYTHON/APP FICHAS/templates/PLANTILLA_TECHPACK_ARTE_CARTA.ai";
    var outFile = new File(outPath);
    var saveOpts = new IllustratorSaveOptions();
    saveOpts.pdfCompatible = true;
    saveOpts.embedICCProfile = true;
    saveOpts.compressed = true;
    doc.saveAs(outFile, saveOpts);
})();
