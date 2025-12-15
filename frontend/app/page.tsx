'use client';

import { useCallback, useEffect, useState } from 'react';

interface UserStats {
  maxHealth: number;
  currentHealth: number;
  attack: number;
  defense: number;
  gold: number;
  floor: number;
  bestFloor: number;
}

interface MonsterStats {
  maxHealth: number;
  currentHealth: number;
  attack: number;
  defense: number;
}

type ItemSlot = 'weapon' | 'armor' | 'material';
type ItemRarity =
  | 'common'
  | 'rare'
  | 'legendary'
  | 'epic'
  | 'mystic'
  | 'primal'
  | 'special';

interface ItemStats {
  attack?: number;
  defense?: number;
  health?: number;
}

interface Item {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  stats: ItemStats;
  zone: number;
}

interface InventoryState {
  weapon: Item | null;
  armor: Item | null;
  materials: Item[];
  bag: Item[];
}

interface GameState {
  user: UserStats;
  monster: MonsterStats;
  upgradeCosts: {
    health: number;
    attack: number;
    defense: number;
  };
  inventory: InventoryState;
}

interface BattleResult {
  status: 'victory' | 'defeat' | 'ongoing';
  goldEarned: number;
  newFloor: number;
  bestFloor: number;
  userHealth: number;
  monsterHealth: number;
  drops: Item[];
}

export default function Home() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [battleResult, setBattleResult] = useState<string>('');
  const [lastStatus, setLastStatus] = useState<BattleResult['status'] | ''>('');
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<ItemSlot>('weapon');
  const [drops, setDrops] = useState<Item[]>([]);

  const API_URL = 'http://localhost:3001';

  const HealthBar = ({
    label,
    current,
    max,
    color,
  }: {
    label: string;
    current: number;
    max: number;
    color: string;
  }) => {
    const safeCurrent = Number.isFinite(current) ? Math.max(0, current) : 0;
    const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
    const percent = Math.max(0, Math.min(100, (safeCurrent / safeMax) * 100));
    return (
      <div className="space-y-1">
        <div className="text-sm text-gray-200 font-semibold">{label}</div>
        <div className="relative w-full h-6 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
          <div className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold text-white drop-shadow-sm">
            {Math.round(safeCurrent)} / {Math.round(safeMax)}
          </div>
        </div>
      </div>
    );
  };

  // 게임 상태 조회
  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/game/state`);
      const data = await response.json();
      setGameState(data);
    } catch (error) {
      console.error('게임 상태 조회 실패:', error);
    }
  }, [API_URL]);

  // 전투 실행
  const executeBattle = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/game/battle`, {
        method: 'POST',
      });
      const result: BattleResult = await response.json();

      setLastStatus(result.status);
      setDrops(result.drops || []);

      if (result.status === 'victory') {
        setBattleResult(
          `현재 ${result.newFloor}층 (최고 ${result.bestFloor}층)`
        );
      } else if (result.status === 'defeat') {
        setBattleResult(
          `패배! 1층으로 돌아갔습니다. (최고 ${result.bestFloor}층)`
        );
      } else {
        setBattleResult(
          `현재 ${result.newFloor}층 (최고 ${result.bestFloor}층)`
        );
      }

      // 전투 후 상태 업데이트
      await fetchGameState();
    } catch (error) {
      console.error('전투 실행 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL, fetchGameState]);

  // 업그레이드
  const calcBulkCost = (currentCost: number, amount: number): number => {
    const amt = Math.max(1, Math.floor(amount));
    return (amt * (2 * currentCost + (amt - 1))) / 2;
  };

  const upgrade = async (stat: 'health' | 'attack' | 'defense', amount = 1) => {
    try {
      const currentCost = gameState?.upgradeCosts[stat];
      if (!currentCost) return;
      const required = calcBulkCost(currentCost, amount);
      if (gameState.user.gold < required) {
        alert('골드가 부족합니다.');
        return;
      }

      const response = await fetch(`${API_URL}/game/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stat, amount }),
      });
      const result = await response.json();

      if (result.success) {
        await fetchGameState();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('업그레이드 실패:', error);
    }
  };

  const equipItem = async (itemId: string) => {
    try {
      const response = await fetch(`${API_URL}/game/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const result = await response.json();
      if (!result.success) {
        alert(result.message);
        return;
      }
      await fetchGameState();
    } catch (error) {
      console.error('장비 착용 실패:', error);
    }
  };

  const rarityColor = (rarity: ItemRarity) => {
    switch (rarity) {
      case 'rare':
        return 'text-blue-300';
      case 'legendary':
        return 'text-yellow-300';
      case 'epic':
        return 'text-purple-300';
      case 'mystic':
        return 'text-red-300';
      case 'primal':
        return 'text-cyan-300';
      case 'special':
        return 'text-pink-300';
      default:
        return 'text-gray-200';
    }
  };

  // 1초마다 자동 전투 실행
  useEffect(() => {
    // 초기 상태 로드
    fetchGameState();

    // 1초마다 전투 실행
    const interval = setInterval(() => {
      executeBattle();
    }, 1000);

    return () => clearInterval(interval);
  }, [executeBattle, fetchGameState]);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-xl">게임 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">자동 전투 게임</h1>

        {/* 전투 결과 표시 */}
        {battleResult && (
          <div
            className={`mb-6 p-4 rounded-lg text-center ${
              lastStatus === 'victory'
                ? 'bg-green-600'
                : lastStatus === 'defeat'
                ? 'bg-red-600'
                : 'bg-blue-700'
            }`}
          >
            {battleResult}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 유저 스탯 */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">유저 스탯</h2>
            <div className="space-y-3">
              <HealthBar
                label="체력"
                current={gameState.user.currentHealth}
                max={gameState.user.maxHealth}
                color="bg-green-500"
              />
              <div className="flex justify-between">
                <span>공격력:</span>
                <span className="font-bold text-red-400">
                  {gameState.user.attack}
                </span>
              </div>
              <div className="flex justify-between">
                <span>방어력:</span>
                <span className="font-bold text-yellow-400">
                  {gameState.user.defense}
                </span>
              </div>
              <div className="flex justify-between">
                <span>골드:</span>
                <span className="font-bold text-yellow-300">
                  {gameState.user.gold}원
                </span>
              </div>
              <div className="flex justify-between">
                <span>현재 층:</span>
                <span className="font-bold text-green-400">
                  {gameState.user.floor}층
                </span>
              </div>
            </div>
          </div>

          {/* 몬스터 스탯 */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 text-red-400">
              몬스터 스탯
            </h2>
            <div className="space-y-3">
              <HealthBar
                label="체력"
                current={gameState.monster.currentHealth}
                max={gameState.monster.maxHealth}
                color="bg-red-500"
              />
              <div className="flex justify-between">
                <span>공격력:</span>
                <span className="font-bold text-red-400">
                  {gameState.monster.attack}
                </span>
              </div>
              <div className="flex justify-between">
                <span>방어력:</span>
                <span className="font-bold text-yellow-400">
                  {gameState.monster.defense}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 드롭 결과 */}
        {drops.length > 0 && (
          <div className="bg-gray-800 p-4 rounded-lg mb-6 space-y-2">
            <div className="font-bold text-green-300">드롭 아이템</div>
            <div className="flex flex-wrap gap-2">
              {drops.map((item) => (
                <span
                  key={item.id}
                  className={`px-3 py-1 rounded-full bg-gray-900 text-sm ${rarityColor(
                    item.rarity
                  )}`}
                >
                  {item.name} ({item.rarity})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 장비 요약 */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8 space-y-3">
          <h2 className="text-2xl font-bold text-indigo-300">장비</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900/60 p-4 rounded-lg">
              <div className="text-sm text-gray-300 mb-1">무기</div>
              {gameState.inventory.weapon ? (
                <div
                  className={`font-semibold ${rarityColor(
                    gameState.inventory.weapon.rarity
                  )}`}
                >
                  {gameState.inventory.weapon.name} (
                  {gameState.inventory.weapon.rarity})
                  <div className="text-xs text-gray-300">
                    atk +{gameState.inventory.weapon.stats.attack || 0}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">장착된 무기 없음</div>
              )}
            </div>
            <div className="bg-gray-900/60 p-4 rounded-lg">
              <div className="text-sm text-gray-300 mb-1">방어구</div>
              {gameState.inventory.armor ? (
                <div
                  className={`font-semibold ${rarityColor(
                    gameState.inventory.armor.rarity
                  )}`}
                >
                  {gameState.inventory.armor.name} (
                  {gameState.inventory.armor.rarity})
                  <div className="text-xs text-gray-300">
                    def +{gameState.inventory.armor.stats.defense || 0}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">장착된 방어구 없음</div>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-300">
            재료 보유: {gameState.inventory.materials.length}개
          </div>
        </div>

        {/* 업그레이드 섹션 */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-bold text-green-400">업그레이드</h2>
          <p className="text-gray-300">원하는 만큼 한 번에 업그레이드하세요.</p>
          {(['health', 'attack', 'defense'] as const).map((stat) => {
            const currentCost = gameState.upgradeCosts[stat];
            const cost1 = calcBulkCost(currentCost, 1);
            const cost10 = calcBulkCost(currentCost, 10);
            const cost100 = calcBulkCost(currentCost, 100);
            const label =
              stat === 'health'
                ? '체력'
                : stat === 'attack'
                ? '공격력'
                : '방어력';
            const baseColor =
              stat === 'health' ? 'blue' : stat === 'attack' ? 'red' : 'yellow';
            return (
              <div
                key={stat}
                className="bg-gray-900/60 p-4 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{label}</span>
                  <span className="text-sm text-gray-300">
                    현재 비용: {currentCost}원
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { amt: 1, cost: cost1 },
                    { amt: 10, cost: cost10 },
                    { amt: 100, cost: cost100 },
                  ].map(({ amt, cost }) => (
                    <button
                      key={amt}
                      onClick={() => upgrade(stat, amt)}
                      disabled={loading || gameState.user.gold < cost}
                      className={`px-3 py-2 rounded-md font-semibold transition disabled:bg-gray-600 disabled:cursor-not-allowed bg-${baseColor}-600 hover:bg-${baseColor}-700`}
                    >
                      {label} +{amt} ({cost}원)
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 게임 설명 */}
        <div className="mt-8 bg-gray-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-bold text-purple-300">인벤토리</h2>
          <div className="flex gap-2">
            {(['weapon', 'armor', 'material'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-4 py-2 rounded-md font-semibold ${
                  selectedTab === tab ? 'bg-purple-600' : 'bg-gray-700'
                }`}
              >
                {tab === 'weapon'
                  ? '무기'
                  : tab === 'armor'
                  ? '방어구'
                  : '재료'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {gameState.inventory.bag
              .filter(
                (i) =>
                  i.slot === selectedTab ||
                  (selectedTab === 'material' && i.slot === 'material')
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-gray-900/60 p-3 rounded-md"
                >
                  <div>
                    <div
                      className={`font-semibold ${rarityColor(item.rarity)}`}
                    >
                      {item.name} ({item.rarity})
                    </div>
                    <div className="text-xs text-gray-300">
                      atk +{item.stats.attack || 0} / def +
                      {item.stats.defense || 0}{' '}
                      {item.stats.health ? `/ hp +${item.stats.health}` : ''}
                    </div>
                  </div>
                  {item.slot !== 'material' && (
                    <button
                      onClick={() => equipItem(item.id)}
                      className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold"
                    >
                      장착
                    </button>
                  )}
                </div>
              ))}

            {selectedTab === 'material' &&
              gameState.inventory.materials.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-gray-900/60 p-3 rounded-md"
                >
                  <div className={`font-semibold ${rarityColor(item.rarity)}`}>
                    {item.name} ({item.rarity})
                  </div>
                  <span className="text-xs text-gray-300">재료</span>
                </div>
              ))}

            {gameState.inventory.bag.filter((i) =>
              selectedTab === 'material'
                ? i.slot === 'material'
                : i.slot === selectedTab
            ).length === 0 &&
              (selectedTab !== 'material'
                ? gameState.inventory.materials.length === 0
                : true) && (
                <div className="text-gray-400 text-sm">아이템이 없습니다.</div>
              )}
          </div>
        </div>

        {/* 게임 설명 */}
        <div className="mt-8 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-2">게임 규칙</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>1초마다 자동으로 전투가 진행됩니다.</li>
            <li>
              유저 공격력이 몬스터 공격력보다 높으면 승리하여 다음 층으로
              올라갑니다.
            </li>
            <li>
              승리 시 층수만큼 골드를 획득합니다 (1층 = 1원, 100층 = 100원).
            </li>
            <li>패배 시 1층으로 돌아갑니다.</li>
            <li>
              몬스터는 층수에 따라 공격력과 체력이 +1, 방어력이 +0.5씩
              증가합니다.
            </li>
            <li>골드를 사용하여 스탯을 업그레이드할 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
