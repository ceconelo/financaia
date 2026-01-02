/**
 * Centraliza a lógica de ciclos de faturamento (Corte).
 * O ciclo de um mês M começa no dia 9 do mês M-1 e termina no dia 8 do mês M.
 */

export interface CycleRange {
    startDate: Date;
    endDate: Date;
}

export function getCycleRange(month: number, year: number): CycleRange {
    // O mês no JS é 0-indexed para o construtor Date, mas recebemos 1-indexed (1-12)
    const startDate = new Date(year, month - 2, 9, 0, 0, 0);
    const endDate = new Date(year, month - 1, 8, 23, 59, 59, 999);

    return { startDate, endDate };
}

/**
 * Retorna o mês e ano do ciclo atual baseado na data informada ou "agora".
 * Se hoje for dia 9 ou depois, já estamos no ciclo do mês seguinte?
 * Não, se o ciclo termina dia 8, no dia 9 começa o próximo.
 * Ex: Hoje é 10 de Jan. O ciclo que terminou dia 8 foi Janeiro. O ciclo atual é Fevereiro (9/Jan a 8/Fev).
 */
export function getCurrentCycleInfo(date: Date = new Date()) {
    const day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    if (day >= 9) {
        month++;
        if (month > 12) {
            month = 1;
            year++;
        }
    }

    return { month, year };
}
