export class Base62Util {
  private static readonly ALPHABET =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private static readonly BASE = 62;

  static encode(num: number | bigint): string {
    if (num === 0 || num === 0n) return this.ALPHABET[0];

    let result = '';
    let number = typeof num === 'bigint' ? num : BigInt(num);

    while (number > 0) {
      const remainder = number % BigInt(this.BASE);
      result = this.ALPHABET[Number(remainder)] + result;
      number = number / BigInt(this.BASE);
    }

    return result;
  }

  static decode(str: string): bigint {
    if (!str || str.length === 0)
      throw new Error('Invalid Base62 string: empty or null');

    let result = 0n;
    const strLength = str.length;

    for (let i = 0; i < strLength; i++) {
      const char = str[i];
      const charIndex = this.ALPHABET.indexOf(char);

      if (charIndex === -1)
        throw new Error(`Invalid Base62 character: ${char}`);

      const power = BigInt(strLength - 1 - i);
      result += BigInt(charIndex) * BigInt(this.BASE) ** power;
    }
    return result;
  }

  static isValidBase62(str: string): boolean {
    if (!str || str.length === 0) return false;

    for (const char of str) {
      if (this.ALPHABET.indexOf(char) === -1) return false;
    }

    return true;
  }

  static generateRandom(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * this.BASE);
      result += this.ALPHABET[randomIndex];
    }
    return result;
  }
}
