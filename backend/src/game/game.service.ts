import { Injectable } from '@nestjs/common';

export interface UserStats {
  maxHealth: number;
  currentHealth: number;
  attack: number;
  defense: number;
  gold: number;
  floor: number;
  bestFloor: number;
}

export interface MonsterStats {
  maxHealth: number;
  currentHealth: number;
  attack: number;
  defense: number;
}

export type ItemSlot = 'weapon' | 'armor' | 'material';
export type ItemRarity =
  | 'common'
  | 'rare'
  | 'legendary'
  | 'epic'
  | 'mystic'
  | 'primal'
  | 'special';

export interface ItemStats {
  attack?: number;
  defense?: number;
  health?: number;
}

export interface Item {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  stats: ItemStats;
  zone: number;
}

export interface UpgradeCosts {
  health: number;
  attack: number;
  defense: number;
}

export interface GameStateResponse {
  user: UserStats;
  monster: MonsterStats;
  upgradeCosts: UpgradeCosts;
  inventory: InventoryState;
}

export interface BattleResult {
  status: 'victory' | 'defeat' | 'ongoing';
  goldEarned: number;
  newFloor: number;
  bestFloor: number;
  userHealth: number;
  monsterHealth: number;
  drops: Item[];
}

export interface InventoryState {
  weapon: Item | null;
  armor: Item | null;
  materials: Item[];
  bag: Item[];
}

@Injectable()
export class GameService {
  private userStats: UserStats = {
    maxHealth: 100,
    currentHealth: 100,
    attack: 100,
    defense: 0,
    gold: 0,
    floor: 1,
    bestFloor: 1,
  };
  private monsterFloor = 1;
  private monsterHealth = this.getMonsterStats(1).maxHealth;
  private upgradeCounts: UpgradeCosts = {
    health: 0,
    attack: 0,
    defense: 0,
  };
  private inventory: InventoryState = {
    weapon: null,
    armor: null,
    materials: [],
    bag: [],
  };
  private itemIdCounter = 1;

  private getExponent(floor: number): number {
    // 10만층마다 0.05씩 제곱 증가 (무한히 증가)
    const segment = Math.max(0, Math.floor((Math.max(1, floor) - 1) / 100000));
    return 1 + 0.05 * segment;
  }

  private getBaseStats(floor: number) {
    const safeFloor = Math.max(1, floor);
    const exponent = this.getExponent(safeFloor);
    const base = Math.pow(safeFloor, exponent);
    return {
      attack: base,
      maxHealth: base,
      defense: base * 0.5,
    };
  }

  private getZone(floor: number): number {
    if (floor <= 500) return 1;
    if (floor <= 3000) return 2;
    if (floor <= 15000) return 3;
    if (floor <= 500000) return 4;
    if (floor <= 1000000) return 5;
    return 6;
  }

  private zoneTables: Record<
    number,
    {
      rarityWeights: { rarity: ItemRarity; weight: number }[];
      specialShardChance: number; // 0.0005 = 0.05%
      items: Record<
        ItemRarity,
        { name: string; slot: ItemSlot; stats: ItemStats }[]
      >;
    }
  > = {
    1: {
      rarityWeights: [
        { rarity: 'common', weight: 97.9 },
        { rarity: 'rare', weight: 2.0 },
      ],
      specialShardChance: 0.0005,
      items: {
        common: [
          { name: '낡은 단검', slot: 'weapon', stats: { attack: 2 } },
          { name: '가죽 갑옷', slot: 'armor', stats: { defense: 2 } },
          { name: '목궁', slot: 'weapon', stats: { attack: 2 } },
          { name: '누더기 망토', slot: 'armor', stats: { defense: 2 } },
        ],
        rare: [
          { name: '강철 검', slot: 'weapon', stats: { attack: 5 } },
          { name: '판금 갑옷', slot: 'armor', stats: { defense: 5 } },
          { name: '강화 활', slot: 'weapon', stats: { attack: 5 } },
          { name: '가죽 망토', slot: 'armor', stats: { defense: 5 } },
        ],
      } as any,
    },
    2: {
      rarityWeights: [
        { rarity: 'common', weight: 89.9 },
        { rarity: 'rare', weight: 9.0 },
        { rarity: 'legendary', weight: 1.0 },
      ],
      specialShardChance: 0.001,
      items: {
        common: [
          { name: '견고한 도끼', slot: 'weapon', stats: { attack: 8 } },
          { name: '두꺼운 가죽 갑옷', slot: 'armor', stats: { defense: 8 } },
        ],
        rare: [
          { name: '정교한 검', slot: 'weapon', stats: { attack: 14 } },
          { name: '강화 판금', slot: 'armor', stats: { defense: 14 } },
        ],
        legendary: [
          { name: '용살자 대검', slot: 'weapon', stats: { attack: 25 } },
          { name: '수호자의 갑주', slot: 'armor', stats: { defense: 25 } },
          { name: '용 사냥꾼의 활', slot: 'weapon', stats: { attack: 25 } },
          { name: '기사의 망토', slot: 'armor', stats: { defense: 25 } },
        ],
      } as any,
    },
    3: {
      rarityWeights: [
        { rarity: 'common', weight: 77.9 },
        { rarity: 'rare', weight: 16.0 },
        { rarity: 'legendary', weight: 5.5 },
        { rarity: 'epic', weight: 0.5 },
      ],
      specialShardChance: 0.001,
      items: {
        common: [
          { name: '균형잡힌 장검', slot: 'weapon', stats: { attack: 35 } },
          { name: '견고한 흉갑', slot: 'armor', stats: { defense: 35 } },
        ],
        rare: [
          { name: '숙련된 암살검', slot: 'weapon', stats: { attack: 45 } },
          { name: '증강 갑주', slot: 'armor', stats: { defense: 45 } },
        ],
        legendary: [
          { name: '용암의 클레이모어', slot: 'weapon', stats: { attack: 65 } },
          { name: '빙결의 흉갑', slot: 'armor', stats: { defense: 65 } },
        ],
        epic: [
          { name: '지배자의 롱소드', slot: 'weapon', stats: { attack: 90 } },
          { name: '영겁의 흉갑', slot: 'armor', stats: { defense: 90 } },
          {
            name: '지배자의 컴포지트 보우',
            slot: 'weapon',
            stats: { attack: 90 },
          },
          { name: '영겁의 어깨덧옷', slot: 'armor', stats: { defense: 90 } },
        ],
      } as any,
    },
    4: {
      rarityWeights: [
        { rarity: 'common', weight: 64.9 },
        { rarity: 'rare', weight: 25.0 },
        { rarity: 'legendary', weight: 9.0 },
        { rarity: 'epic', weight: 0.98 },
        { rarity: 'mystic', weight: 0.03 },
      ],
      specialShardChance: 0.001,
      items: {
        common: [
          { name: '균형의 대검', slot: 'weapon', stats: { attack: 120 } },
          { name: '강철미늘 갑옷', slot: 'armor', stats: { defense: 120 } },
        ],
        rare: [
          { name: '폭풍 장검', slot: 'weapon', stats: { attack: 150 } },
          { name: '폭풍 갑주', slot: 'armor', stats: { defense: 150 } },
        ],
        legendary: [
          { name: '태양의 클레이모어', slot: 'weapon', stats: { attack: 200 } },
          { name: '달빛의 흉갑', slot: 'armor', stats: { defense: 200 } },
        ],
        epic: [
          { name: '지배자의 장창', slot: 'weapon', stats: { attack: 260 } },
          { name: '지배자의 갑주', slot: 'armor', stats: { defense: 260 } },
        ],
        mystic: [
          { name: '태풍의 눈', slot: 'weapon', stats: { attack: 400 } },
          { name: '폭풍의 망토', slot: 'armor', stats: { defense: 400 } },
          { name: '태초의 파편', slot: 'material', stats: {} },
          { name: '세계수의 심장', slot: 'material', stats: {} },
        ],
      } as any,
    },
    5: {
      rarityWeights: [
        { rarity: 'common', weight: 59.94995 },
        { rarity: 'rare', weight: 28.0 },
        { rarity: 'legendary', weight: 11.0 },
        { rarity: 'epic', weight: 1.02995 },
        { rarity: 'mystic', weight: 0.02 },
        { rarity: 'primal', weight: 0.000001 },
      ],
      specialShardChance: 0.001,
      items: {
        common: [
          { name: '균형의 장검+', slot: 'weapon', stats: { attack: 320 } },
          { name: '강철미늘 갑옷+', slot: 'armor', stats: { defense: 320 } },
        ],
        rare: [
          { name: '폭풍 장검+', slot: 'weapon', stats: { attack: 380 } },
          { name: '폭풍 갑주+', slot: 'armor', stats: { defense: 380 } },
        ],
        legendary: [
          {
            name: '태양의 클레이모어+',
            slot: 'weapon',
            stats: { attack: 480 },
          },
          { name: '달빛의 흉갑+', slot: 'armor', stats: { defense: 480 } },
        ],
        epic: [
          { name: '지배자의 장창+', slot: 'weapon', stats: { attack: 600 } },
          { name: '지배자의 갑주+', slot: 'armor', stats: { defense: 600 } },
        ],
        mystic: [
          { name: '태풍의 눈+', slot: 'weapon', stats: { attack: 900 } },
          { name: '폭풍의 망토+', slot: 'armor', stats: { defense: 900 } },
        ],
        primal: [
          { name: 'Primal 블레이드', slot: 'weapon', stats: { attack: 1500 } },
          { name: 'Primal 방패갑주', slot: 'armor', stats: { defense: 1500 } },
        ],
      } as any,
    },
    6: {
      rarityWeights: [
        { rarity: 'common', weight: 49.1995 },
        { rarity: 'rare', weight: 30.0 },
        { rarity: 'legendary', weight: 13.0 },
        { rarity: 'epic', weight: 1.9 },
        { rarity: 'mystic', weight: 0.16 },
        { rarity: 'primal', weight: 0.00001 },
      ],
      specialShardChance: 0.002,
      items: {
        common: [
          { name: '균형의 장검++', slot: 'weapon', stats: { attack: 600 } },
          { name: '강철미늘 갑옷++', slot: 'armor', stats: { defense: 600 } },
        ],
        rare: [
          { name: '폭풍 장검++', slot: 'weapon', stats: { attack: 750 } },
          { name: '폭풍 갑주++', slot: 'armor', stats: { defense: 750 } },
        ],
        legendary: [
          {
            name: '태양의 클레이모어++',
            slot: 'weapon',
            stats: { attack: 1000 },
          },
          { name: '달빛의 흉갑++', slot: 'armor', stats: { defense: 1000 } },
        ],
        epic: [
          { name: '지배자의 장창++', slot: 'weapon', stats: { attack: 1300 } },
          { name: '지배자의 갑주++', slot: 'armor', stats: { defense: 1300 } },
        ],
        mystic: [
          { name: '태풍의 눈++', slot: 'weapon', stats: { attack: 1800 } },
          { name: '폭풍의 망토++', slot: 'armor', stats: { defense: 1800 } },
        ],
        primal: [
          { name: 'Primal 블레이드+', slot: 'weapon', stats: { attack: 2500 } },
          { name: 'Primal 방패갑주+', slot: 'armor', stats: { defense: 2500 } },
          {
            name: 'Primal 액세서리: 힘',
            slot: 'material',
            stats: { attack: 100 },
          },
        ],
      } as any,
    },
  };

  private rollRarity(zone: number): ItemRarity {
    const table = this.zoneTables[zone];
    const total = table.rarityWeights.reduce((s, r) => s + r.weight, 0);
    const pick = Math.random() * total;
    let acc = 0;
    for (const r of table.rarityWeights) {
      acc += r.weight;
      if (pick <= acc) return r.rarity;
    }
    return table.rarityWeights[table.rarityWeights.length - 1].rarity;
  }

  private createItem(
    zone: number,
    rarity: ItemRarity,
    template: { name: string; slot: ItemSlot; stats: ItemStats }
  ): Item {
    const id = `it-${this.itemIdCounter++}`;
    return {
      id,
      name: template.name,
      slot: template.slot,
      rarity,
      stats: template.stats,
      zone,
    };
  }

  private rollDrop(floor: number, isBoss: boolean): Item[] {
    const drops: Item[] = [];
    const dropChance = isBoss ? 0.1 : 0.02;
    if (Math.random() >= dropChance) {
      return drops;
    }

    const zone = this.getZone(floor);
    const table = this.zoneTables[zone];

    // rarity roll
    const rarity = this.rollRarity(zone);
    const pool = table.items[rarity] || [];
    if (pool.length > 0) {
      const picked = pool[Math.floor(Math.random() * pool.length)];
      drops.push(this.createItem(zone, rarity, picked));
    }

    // special shard independent roll
    if (Math.random() < table.specialShardChance) {
      drops.push(
        this.createItem(zone, 'special', {
          name: '균열의 파편',
          slot: 'material',
          stats: {},
        })
      );
    }

    return drops;
  }

  private addDropsToInventory(drops: Item[]): void {
    for (const item of drops) {
      if (item.slot === 'material') {
        this.inventory.materials.push(item);
      } else {
        this.inventory.bag.push(item);
      }
    }
  }

  private getEquipmentBonus(): ItemStats {
    const weapon = this.inventory.weapon?.stats || {};
    const armor = this.inventory.armor?.stats || {};
    return {
      attack: (weapon.attack || 0) + (armor.attack || 0),
      defense: (weapon.defense || 0) + (armor.defense || 0),
      health: (weapon.health || 0) + (armor.health || 0),
    };
  }

  private getEffectiveUserStats(): UserStats {
    const bonus = this.getEquipmentBonus();
    const maxHealth = this.userStats.maxHealth + (bonus.health || 0);
    const currentHealth = Math.min(
      this.userStats.currentHealth + (bonus.health || 0),
      maxHealth
    );
    return {
      ...this.userStats,
      maxHealth,
      currentHealth,
      attack: this.userStats.attack + (bonus.attack || 0),
      defense: this.userStats.defense + (bonus.defense || 0),
    };
  }

  private getUpgradeCost(stat: keyof UpgradeCosts): number {
    return 1 + this.upgradeCounts[stat];
  }

  private getUpgradeCostBulk(stat: keyof UpgradeCosts, amount: number): number {
    const amt = Math.max(1, Math.floor(amount));
    const start = this.getUpgradeCost(stat);
    // 등차수열 합: n/2 * (2a + (n-1)d) with d = 1
    return (amt * (2 * start + (amt - 1))) / 2;
  }

  private getUpgradeCosts(): UpgradeCosts {
    return {
      health: this.getUpgradeCost('health'),
      attack: this.getUpgradeCost('attack'),
      defense: this.getUpgradeCost('defense'),
    };
  }

  // 몬스터 스탯 계산 (1층부터 시작, 1000층까지)
  getMonsterStats(floor: number): MonsterStats {
    const isBoss = floor > 0 && floor % 100 === 0;

    if (isBoss) {
      // 보스: 바로 전층 일반 몬스터의 스탯 x 10
      const base = this.getBaseStats(Math.max(1, floor - 1));
      const attack = base.attack * 10;
      const maxHealth = base.maxHealth * 10;
      const defense = base.defense * 10;
      return {
        attack,
        maxHealth,
        currentHealth:
          this.monsterFloor === floor ? this.monsterHealth : maxHealth,
        defense,
      };
    }

    // 일반 몬스터
    const base = this.getBaseStats(floor);
    return {
      attack: base.attack,
      maxHealth: base.maxHealth,
      currentHealth:
        this.monsterFloor === floor ? this.monsterHealth : base.maxHealth,
      defense: base.defense,
    };
  }

  // 전투: 1회 호출당 1턴 진행 (유저 공격 -> 몬스터 반격)
  battle(): BattleResult {
    const floor = this.userStats.floor;
    const monsterStats = this.getMonsterStats(floor);
    const effectiveUser = this.getEffectiveUserStats();
    const bonusHealth = this.getEquipmentBonus().health || 0;

    // 층이 바뀌었거나 몬스터 체력이 초기화되어야 하면 리셋
    if (this.monsterFloor !== floor || this.monsterHealth <= 0) {
      this.monsterFloor = floor;
      this.monsterHealth = monsterStats.maxHealth;
    }

    // 방어를 고려한 대미지(최소 1)
    const userDamage = Math.max(1, effectiveUser.attack - monsterStats.defense);
    const monsterDamage = Math.max(
      1,
      monsterStats.attack - effectiveUser.defense
    );

    let monsterHp = this.monsterHealth;
    let userHp = effectiveUser.currentHealth;

    // 유저 공격
    monsterHp -= userDamage;
    if (monsterHp <= 0) {
      // 승리: 골드 획득, 층수 상승, 체력 전부 회복
      const goldEarned = floor;
      this.userStats.gold += goldEarned;
      this.userStats.floor += 1;
      this.userStats.bestFloor = Math.max(
        this.userStats.bestFloor,
        this.userStats.floor
      );
      this.userStats.currentHealth = this.userStats.maxHealth;

      // 다음 층 몬스터 체력 초기화
      this.monsterFloor = this.userStats.floor;
      const nextMonster = this.getMonsterStats(this.userStats.floor);
      this.monsterHealth = nextMonster.maxHealth;

      const drops = this.rollDrop(floor, floor % 100 === 0);
      this.addDropsToInventory(drops);

      return {
        status: 'victory',
        goldEarned,
        newFloor: this.userStats.floor,
        bestFloor: this.userStats.bestFloor,
        userHealth: this.userStats.currentHealth,
        monsterHealth: 0,
        drops,
      };
    }

    // 몬스터 반격
    userHp -= monsterDamage;

    this.monsterHealth = monsterHp;
    this.userStats.currentHealth = Math.max(0, userHp - bonusHealth);

    if (userHp <= 0) {
      // 패배: 1층으로 리셋, 체력 전부 회복, 몬스터도 초기화
      this.userStats.floor = 1;
      this.userStats.currentHealth = this.userStats.maxHealth;
      this.monsterFloor = 1;
      const resetMonster = this.getMonsterStats(1);
      this.monsterHealth = resetMonster.maxHealth;

      return {
        status: 'defeat',
        goldEarned: 0,
        newFloor: 1,
        bestFloor: this.userStats.bestFloor,
        userHealth: this.userStats.currentHealth,
        monsterHealth: this.monsterHealth,
        drops: [],
      };
    }

    // 전투 진행 중 (아직 승패 없음)
    return {
      status: 'ongoing',
      goldEarned: 0,
      newFloor: this.userStats.floor,
      bestFloor: this.userStats.bestFloor,
      userHealth: this.userStats.currentHealth,
      monsterHealth: this.monsterHealth,
      drops: [],
    };
  }

  getInventoryState(): InventoryState {
    return this.inventory;
  }

  equip(itemId: string): {
    success: boolean;
    message: string;
    inventory?: InventoryState;
  } {
    const item =
      this.inventory.bag.find((i) => i.id === itemId) ||
      this.inventory.materials.find((i) => i.id === itemId) ||
      (this.inventory.weapon && this.inventory.weapon.id === itemId)
        ? this.inventory.weapon
        : this.inventory.armor && this.inventory.armor.id === itemId
        ? this.inventory.armor
        : null;

    if (!item) {
      return { success: false, message: '아이템을 찾을 수 없습니다.' };
    }
    if (item.slot === 'material') {
      return { success: false, message: '재료 아이템은 착용할 수 없습니다.' };
    }

    if (item.slot === 'weapon') {
      this.inventory.weapon = item;
    } else if (item.slot === 'armor') {
      this.inventory.armor = item;
    }

    return {
      success: true,
      message: `${item.name} 장착 완료`,
      inventory: this.inventory,
    };
  }

  // 업그레이드: 골드를 사용하여 스탯 증가
  upgrade(
    stat: 'health' | 'attack' | 'defense',
    amount = 1
  ): {
    success: boolean;
    message: string;
    spentCost?: number;
    nextCosts?: UpgradeCosts;
  } {
    const amt = Math.max(1, Math.floor(amount));
    const cost = this.getUpgradeCostBulk(stat, amt);

    if (this.userStats.gold < cost) {
      return {
        success: false,
        message: '골드가 부족합니다.',
      };
    }

    this.userStats.gold -= cost;
    this.upgradeCounts[stat] += amt;
    if (stat === 'health') {
      this.userStats.maxHealth += amt;
      this.userStats.currentHealth += amt;
    } else {
      this.userStats[stat] += amt;
    }

    return {
      success: true,
      message: `${stat}이(가) ${amt} 증가했습니다.`,
      spentCost: cost,
      nextCosts: this.getUpgradeCosts(),
    };
  }

  // 현재 게임 상태 조회
  getGameState(): GameStateResponse {
    return {
      user: { ...this.getEffectiveUserStats() },
      monster: this.getMonsterStats(this.userStats.floor),
      upgradeCosts: this.getUpgradeCosts(),
      inventory: this.inventory,
    };
  }

  // 게임 리셋 (선택사항)
  resetGame(): void {
    this.userStats = {
      maxHealth: 100,
      currentHealth: 100,
      attack: 100,
      defense: 0,
      gold: 0,
      floor: 1,
      bestFloor: 1,
    };
    this.upgradeCounts = {
      health: 0,
      attack: 0,
      defense: 0,
    };
    this.monsterFloor = 1;
    this.monsterHealth = this.getMonsterStats(1).maxHealth;
    this.inventory = {
      weapon: null,
      armor: null,
      materials: [],
      bag: [],
    };
  }
}
