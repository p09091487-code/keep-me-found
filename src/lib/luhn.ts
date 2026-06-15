/**
 * Vérifie qu'un IMEI (15 chiffres) est mathématiquement valide via l'algorithme de Luhn.
 */
export function isValidImei(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = imei.charCodeAt(i) - 48;
    // À partir de la droite, double un chiffre sur deux. i parcourt de gauche à droite.
    // Position depuis la droite = 14 - i. On double si (14 - i) % 2 === 1 → i pair (0,2,4...) NON.
    // Convention IMEI Luhn : doubler les chiffres en positions paires depuis la droite (2e,4e...).
    // i=0..14 ; depuis la droite : pos = 15 - i. Double si pos % 2 === 0 → i impair.
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}
