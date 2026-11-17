//% color=#0fbc11 icon="\uf0cb" block="Yahboom 8Ch Tracker"
namespace yahboomTracker {
    const MODULE_ADDRESS = 0x12; // כתובת ה-I2C של המודול
    const REG_ADDRESS = 0x30;    // רגיסטר לקריאה דיגיטלית

    /**
     * מחזיר את מספר החיישן הכי שמאלי (הקרוב ל-1) שרואה קו. אם אין קו, מחזיר 0.
     */
    //% block="החיישן הכי שמאלי שדולק"
    //% weight=35
    export function getLeftmostActive(): number {
        let data = readRawData();
        for (let i = 1; i <= 8; i++) {
            let val = (data >> (8 - i)) & 0x01;
            if (val === 1) {
                return i; // הראשון שפוגשים מכיוון 1 הוא הכי שמאלי
            }
        }
        return 0; // אין חיישן דלוק
    }

    /**
     * מחזיר את מספר החיישן הכי ימני (הקרוב ל-8) שרואה קו. אם אין קו, מחזיר 0.
     */
    //% block="החיישן הכי ימני שדולק"
    //% weight=34
    export function getRightmostActive(): number {
        let data = readRawData();
        for (let i = 8; i >= 1; i--) {
            let val = (data >> (8 - i)) & 0x01;
            if (val === 1) {
                return i; // הראשון שפוגשים מכיוון 8 הוא הכי ימני
            }
        }
        return 0; // אין חיישן דלוק
    }

    /**
     * מחזיר אמת אם כל החיישנים שדולקים יוצרים רצף אחיד וצמוד ללא פערים, ושקר אם יש הפרשים או נתקים.
     */
    //% block="האם החיישנים הדלוקים צמודים ברצף?"
    //% weight=30
    export function isContinuousLine(): boolean {
        let data = readRawData();
        if (data === 0) return false;

        let first = -1;
        let last = -1;
        let activeCount = 0;

        for (let i = 0; i < 8; i++) {
            let val = (data >> (7 - i)) & 0x01;
            if (val === 1) {
                if (first === -1) {
                    first = i;
                }
                last = i;
                activeCount++;
            }
        }

        let expectedCount = (last - first) + 1;
        return activeCount === expectedCount;
    }

    /**
     * מחשב את מרכז הקו (ממוצע מיקומי החיישנים הפעילים). 
     * לדוגמה, אם חיישנים 6, 7 ו-8 רואים קו, יחזיר את המספר 7. אם אין קו, יחזיר 0.
     */
    //% block="מרכז הקו"
    //% weight=40
    export function getLineCenter(): number {
        let data = readRawData();
        let sumIndex = 0;
        let count = 0;

        for (let i = 1; i <= 8; i++) {
            let val = (data >> (8 - i)) & 0x01;
            if (val === 1) {
                sumIndex += i;
                count++;
            }
        }

        if (count === 0) {
            return 0; // אין קו
        }
        return (sumIndex / count);
    }

    /**
     * מחזיר אמת (True) אם הרובוט מזהה קו בכלל, או שקר (False) אם איבד את הקו
     */
    //% block="האם זוהה קו?"
    //% weight=60
    export function isLineDetected(): boolean {
        return readRawData() > 0;
    }

    /**
     * בודק כמה חיישנים מתוך ה-8 רואים קו כרגע (מחזיר מספר בין 0 ל-8)
     */
    //% block="כמות החיישנים שרואים קו"
    //% weight=50
    export function countActiveSensors(): number {
        let data = readRawData();
        let count = 0;
        for (let i = 0; i < 8; i++) {
            if ((data >> i) & 0x01) {
                count++;
            }
        }
        return count;
    }

    /**
     * מדפיס בצורה מסודרת בעברית למוניטור הטורי את מצב כל 8 החיישנים
     */
    //% block="הצג את מצב החיישנים"
    //% weight=90
    export function printStatusSerial(): void {
        let data = readRawData();
        let text = "מצב חיישנים (1-8): ";
        for (let i = 1; i <= 8; i++) {
            let val = (data >> (8 - i)) & 0x01;
            text += "ח" + i + ":" + val + " ";
        }
        serial.writeLine(text);
    }

    /**
     * קרא את כל 8 החיישנים כבית בינארי שלם (0 עד 255)
     * הופך את הביטים כך ש-1 = קו שחור ו-0 = משטח לבן
     */
    //% block="קרא בית גולמי מהחיישן (0-255)"
    //% weight=20
    //% advanced=true
    export function readRawData(): number {
        pins.i2cWriteNumber(
            MODULE_ADDRESS,
            REG_ADDRESS,
            NumberFormat.UInt8BE,
            false
        );
        basic.pause(10); // השהייה הנדרשת לפי מפרט היצרן
        let buf = pins.i2cReadBuffer(MODULE_ADDRESS, 1, false);
        return (~buf[0]) & 0xFF;
    }

    /**
     * מחזיר אמת אם חיישן ספציפי רואה קו, ושקר אם לא (בלוק בוליאני לתנאים).
     * @param ch מספר החיישן בין 1 ל-8
     */
    //% block="האם חיישן מס' %ch רואה קו?"
    //% ch.min=1 ch.max=8 ch.defl=1
    //% weight=70
    export function isSensorActive(ch: number): boolean {
        return readChannel(ch) === 1;
    }

    /**
     * קרא את המצב של חיישן ספציפי (1 עד 8). מחזיר 0 (לבן) או 1 (שחור/קו).
     * @param ch מספר החיישן בין 1 ל-8
     */
    //% block="קרא חיישן מס' %ch (1-8)"
    //% ch.min=1 ch.max=8 ch.defl=1
    //% weight=80
    export function readChannel(ch: number): number {
        let data = readRawData();
        if (ch < 1) ch = 1;
        if (ch > 8) ch = 8;
        let shift = 8 - ch;
        return (data >> shift) & 0x01;
    }
}
