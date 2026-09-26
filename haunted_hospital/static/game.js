/* ============================================================
   WARD 0 — a turn-based horror RPG demo
   Pure client-side state machine. No backend required.
   ============================================================ */

const WEAPONS = {
  pole:    { name: 'Bent IV Pole', dmg: [4, 7] },
  scalpel: { name: 'Rusty Scalpel', dmg: [6, 10] },
};

const ITEM_DEFS = {
  bandage:  { name: 'Bandage',  desc: 'Wrap a wound. Heals 12 HP.' },
  sedative: { name: 'Sedative', desc: 'Swallow it dry. Restores 10 Sanity.' },
};

function freshState() {
  return {
    screen: 'title',
    hp: 34, maxHp: 34,
    sanity: 24, maxSanity: 24,
    weapon: WEAPONS.pole,
    items: { bandage: 2, sedative: 1 },
    flags: {},
    room: 'intake',
    combat: null,
  };
}

let S = freshState();

/* ---------------- Enemies ---------------- */

const ENEMIES = {
  crawler: {
    name: 'Crawling Patient',
    maxHp: 12, canFlee: true,
    moves: [
      { w: 5, hp: [2, 4], sn: [0, 0], text: 'It claws at you with broken fingers.' },
      { w: 2, hp: [4, 7], sn: [0, 1], text: 'It lunges wildly, gnashing its teeth.' },
    ],
  },
  nurse: {
    name: 'Nurse Wraith',
    maxHp: 18, canFlee: true,
    moves: [
      { w: 4, hp: [3, 6], sn: [0, 0], text: 'The wraith slashes with a rusted scalpel.' },
      { w: 3, hp: [0, 0], sn: [3, 6], text: 'She leans close and whispers everything wrong with you.' },
      { w: 2, hp: [2, 4], sn: [1, 2], text: 'Freezing fingers close around your arm.' },
    ],
  },
  shadowchild: {
    name: 'Something in the Drawers',
    maxHp: 10, canFlee: true,
    moves: [
      { w: 4, hp: [1, 2], sn: [4, 7], text: "A child's giggle echoes from every drawer at once." },
      { w: 3, hp: [2, 4], sn: [1, 1], text: 'Small cold hands drag at your ankles.' },
    ],
  },
  surgeon: {
    name: 'The Surgeon',
    maxHp: 26, canFlee: false,
    moves: [
      { w: 4, hp: [4, 8], sn: [0, 1], text: 'The bone saw shrieks as it swings toward you.' },
      { w: 2, hp: [1, 3], sn: [3, 6], text: '"Hold still," he says. "This will only hurt forever."' },
      { w: 2, hp: [0, 0], sn: [0, 0], heal: [3, 6], text: 'He calmly stitches his own wound shut.' },
    ],
  },
  matron: {
    name: 'The Shadow Matron',
    maxHp: 34, canFlee: false,
    moves: [
      { w: 4, hp: [4, 7], sn: [1, 3], text: 'Her shadow flickers like a dying monitor.' },
      { w: 3, hp: [0, 0], sn: [5, 8], text: '"Hush now," she says, in your mother’s voice.' },
    ],
    phase2Moves: [
      { w: 4, hp: [6, 10], sn: [4, 6], text: 'She is in every doorway at once, and none of them are real.' },
    ],
  },
};

/* ---------------- Enemy graphics (inline SVG) ---------------- */

const ENEMY_ART = {
  crawler: `
    <svg class="enemy-svg" viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
      <line x1="112" y1="42" x2="140" y2="8" stroke="#4a4e57" stroke-width="2" stroke-dasharray="3 3"/>
      <rect x="134" y="2" width="12" height="10" fill="#3a3d44" stroke="#555" stroke-width="1"/>
      <path d="M40,72 Q20,55 8,32" stroke="#23262c" stroke-width="9" fill="none" stroke-linecap="round" class="body-stroke"/>
      <path d="M118,70 Q140,58 152,42" stroke="#23262c" stroke-width="9" fill="none" stroke-linecap="round" class="body-stroke"/>
      <ellipse cx="78" cy="72" rx="52" ry="17" class="body"/>
      <ellipse cx="106" cy="54" rx="17" ry="13" class="body"/>
      <circle cx="100" cy="51" r="2.6" class="eye"/>
      <circle cx="112" cy="51" r="2.6" class="eye"/>
    </svg>`,
  nurse: `
    <svg class="enemy-svg" viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
      <path d="M60,18 C36,18 22,70 16,150 L104,150 C98,70 84,18 60,18 Z" class="body"/>
      <rect x="42" y="72" width="36" height="60" fill="#24272d"/>
      <ellipse cx="60" cy="26" rx="24" ry="27" class="body"/>
      <path d="M38,20 C38,42 82,42 82,20" fill="none" stroke="#0000" />
      <circle cx="51" cy="24" r="3" class="eye"/>
      <circle cx="69" cy="24" r="3" class="eye"/>
      <path d="M96,86 L112,74 L106,68 L92,80 Z" fill="#8a8f99"/>
    </svg>`,
  shadowchild: `
    <svg class="enemy-svg" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="58" width="144" height="54" rx="3" class="body"/>
      <rect x="8" y="58" width="144" height="6" fill="#3a3d44"/>
      <rect x="54" y="30" width="52" height="42" fill="#050506"/>
      <ellipse cx="80" cy="46" rx="15" ry="16" fill="#050506" stroke="#1c1e22" stroke-width="1"/>
      <ellipse cx="58" cy="66" rx="7" ry="10" fill="#050506"/>
      <ellipse cx="102" cy="66" rx="7" ry="10" fill="#050506"/>
      <circle cx="74" cy="44" r="2.4" class="eye"/>
      <circle cx="86" cy="44" r="2.4" class="eye"/>
    </svg>`,
  surgeon: `
    <svg class="enemy-svg" viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
      <path d="M34,52 L86,52 L94,148 L26,148 Z" class="body"/>
      <rect x="42" y="18" width="34" height="32" rx="7" class="body"/>
      <rect x="42" y="38" width="34" height="9" fill="#3a3d44"/>
      <circle cx="52" cy="28" r="2.6" class="eye"/>
      <circle cx="66" cy="28" r="2.6" class="eye"/>
      <path d="M86,58 L112,34 L106,26 L94,36 L98,42 L82,64 Z" fill="#8a8f99"/>
      <path d="M100,34 L108,26 M104,38 L112,30" stroke="#c62828" stroke-width="2"/>
    </svg>`,
  matron: `
    <svg class="enemy-svg" viewBox="0 0 140 180" xmlns="http://www.w3.org/2000/svg">
      <path d="M70,12 C34,14 6,150 0,176 L140,176 C134,150 106,14 70,12 Z" class="body"/>
      <path d="M0,150 C-18,140 -26,120 -22,100" stroke="#1c1e22" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M140,150 C158,140 166,120 162,100" stroke="#1c1e22" stroke-width="8" fill="none" stroke-linecap="round"/>
      <circle cx="58" cy="46" r="3" class="eye"/>
      <circle cx="82" cy="46" r="3" class="eye"/>
      <circle cx="40" cy="86" r="2.2" class="eye"/>
      <circle cx="102" cy="70" r="2.2" class="eye"/>
    </svg>`,
};

/* ---------------- Utility ---------------- */

function rand(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function isUnstable() { return S.sanity <= Math.floor(S.maxSanity * 0.3); }

function weightedPick(moves) {
  const total = moves.reduce((a, m) => a + m.w, 0);
  let r = Math.random() * total;
  for (const m of moves) {
    if (r < m.w) return m;
    r -= m.w;
  }
  return moves[moves.length - 1];
}

function damagePlayer(amount) {
  S.hp = clamp(S.hp - amount, 0, S.maxHp);
  if (amount > 0) {
    const overlay = document.getElementById('flash-overlay');
    overlay.classList.remove('hit');
    void overlay.offsetWidth;
    overlay.classList.add('hit');
  }
}
function healPlayer(amount) { S.hp = clamp(S.hp + amount, 0, S.maxHp); }
function drainSanity(amount) { S.sanity = clamp(S.sanity - amount, 0, S.maxSanity); }
function restoreSanity(amount) { S.sanity = clamp(S.sanity + amount, 0, S.maxSanity); }

/* ---------------- Rooms ---------------- */

const ROOMS = {

  intake: {
    name: 'Intake Room',
    text() {
      return "The fluorescent light overhead buzzes, on-off, on-off. You were sitting in a chair a moment " +
        "ago, waiting for a nurse to call your name. Now the waiting room is gone. The door out is hanging " +
        "half off its hinges, and the corridor beyond it is much longer than it should be.";
    },
    choices() {
      return [{ label: 'Leave the room', run: () => goto('corridor') }];
    },
  },

  corridor: {
    name: 'The Corridor',
    text() {
      let t = "Doors line a hallway that keeps going past where the building's walls should end. The exit " +
        "sign at the far end flickers between EXIT and EXIT with the letters rearranged.";
      if (isUnstable()) {
        t += "\n\nSomewhere behind you, someone says your name. You are alone.";
      }
      return t;
    },
    choices() {
      const c = [];
      c.push({ label: 'Emergency Ward' + (S.flags.wardCleared ? ' (cleared)' : ''), run: () => goto('ward') });
      c.push({ label: "Nurse's Station" + (S.flags.nurseCleared ? ' (cleared)' : ''), run: () => goto('nurse_station') });
      c.push({ label: 'The Chapel' + (S.flags.chapelVisited ? ' (visited)' : ''), run: () => goto('chapel') });
      c.push({ label: 'The Morgue' + (S.flags.morgueVisited ? ' (visited)' : ''), run: () => goto('morgue') });
      if (S.flags.hasKeycard && !S.flags.surgeonCleared) {
        c.push({ label: 'Descend to the Basement', run: () => goto('basement') });
      } else if (!S.flags.hasKeycard) {
        c.push({
          label: 'Basement Stairwell (locked)',
          run: () => { logEvent('The door is padlocked shut around an electronic reader. It needs a keycard — or enough force.'); renderExplore(); },
        });
        c.push({
          label: 'Pry the basement door open',
          run: () => {
            damagePlayer(5);
            logEvent('You wedge the IV pole into the frame and heave. The lock tears loose, but the door’s edge bites your arm on the way through. (-5 HP)');
            S.flags.hasKeycard = true;
            S.flags.forcedDoor = true;
            if (!checkVitals()) renderExplore();
          },
        });
      }
      if (S.flags.surgeonCleared) {
        c.push({ label: 'Follow the cold draft toward the Exit', run: () => goto('exit_hall') });
      }
      return c;
    },
  },

  ward: {
    name: 'Emergency Ward',
    text() {
      if (S.flags.wardCleared) {
        return 'Overturned gurneys. Curtains torn from their rails. Whatever was here, you already dealt with it.';
      }
      return 'Curtains sway around empty beds, though the air is still. Under one of them, something is ' +
        'dragging itself across the floor toward you.';
    },
    onEnter() {
      if (!S.flags.wardCleared) {
        startCombat('crawler', {
          onWin: () => {
            S.flags.wardCleared = true;
            S.items.bandage = (S.items.bandage || 0) + 1;
            logEvent('You found a bandage among the wreckage.');
            goto('ward');
          },
          onFlee: 'corridor',
        });
        return true;
      }
      return false;
    },
    choices() {
      return [{ label: 'Return to the corridor', run: () => goto('corridor') }];
    },
  },

  nurse_station: {
    name: "Nurse's Station",
    text() {
      if (S.flags.nurseCleared) {
        return 'The station is quiet now. A keycard sits on the counter where you left it, next to a ' +
          'clipboard of admissions that all list your name.';
      }
      return 'A figure in a stained uniform stands perfectly still behind the counter, facing the wall. ' +
        'As you step closer, it turns around far too slowly.';
    },
    onEnter() {
      if (!S.flags.nurseCleared) {
        startCombat('nurse', {
          onWin: () => {
            S.flags.nurseCleared = true;
            S.flags.hasKeycard = true;
            logEvent('The wraith dissolves into static. A keycard clatters to the floor: BASEMENT ACCESS.');
            goto('nurse_station');
          },
          onFlee: 'corridor',
        });
        return true;
      }
      return false;
    },
    choices() {
      return [{ label: 'Return to the corridor', run: () => goto('corridor') }];
    },
  },

  chapel: {
    name: 'The Chapel',
    text() {
      let t = 'A small chapel, pews dusted with plaster from the ceiling. Candles burn with no one to have ' +
        'lit them. On the altar sits an orange pill bottle.';
      if (S.flags.chapelVisited) {
        t = 'The candles are still burning. They never seem to get any shorter.';
      }
      return t;
    },
    onEnter() { S.flags.chapelVisited = true; return false; },
    choices() {
      const c = [];
      if (!S.flags.tookSedative && !S.flags.chapelPillsGone) {
        c.push({
          label: 'Take the pill bottle',
          run: () => {
            S.items.sedative = (S.items.sedative || 0) + 1;
            S.flags.chapelPillsGone = true;
            logEvent('You pocket the sedatives. They rattle louder than they should.');
            goto('chapel');
          },
        });
      }
      if (!S.flags.prayed) {
        c.push({
          label: 'Pray at the altar',
          run: () => {
            S.flags.prayed = true;
            drainSanity(3);
            logEvent('You kneel. Whatever answers back, it is not what you prayed to. (-3 Sanity)');
            checkVitals();
            if (S.screen !== 'end') goto('chapel');
          },
        });
      }
      c.push({ label: 'Return to the corridor', run: () => goto('corridor') });
      return c;
    },
  },

  morgue: {
    name: 'The Morgue',
    text() {
      if (S.flags.morgueSearched) {
        return 'Rows of steel drawers, all closed now, all silent.';
      }
      return 'The cold hits first. Steel drawers line both walls, floor to ceiling. Some of them are ' +
        'not quite shut.';
    },
    onEnter() {
      if (!S.flags.morgueVisited) {
        S.flags.morgueVisited = true;
        drainSanity(2);
        logEvent('Just standing here costs you something. (-2 Sanity)');
        checkVitals();
        return S.screen === 'end';
      }
      return false;
    },
    choices() {
      const c = [];
      if (!S.flags.morgueSearched) {
        c.push({
          label: 'Search the drawers',
          run: () => {
            startCombat('shadowchild', {
              onWin: () => {
                S.flags.morgueSearched = true;
                if (!S.flags.hasScalpel) {
                  S.flags.hasScalpel = true;
                  S.weapon = WEAPONS.scalpel;
                  logEvent('Beneath cold linen you find a Rusty Scalpel. You take it. New weapon equipped.');
                }
                goto('morgue');
              },
              onFlee: 'corridor',
            });
          },
        });
        c.push({
          label: 'Leave quietly',
          run: () => { logEvent('You back out of the morgue without looking away from the drawers.'); goto('corridor'); },
        });
      } else {
        c.push({ label: 'Return to the corridor', run: () => goto('corridor') });
      }
      return c;
    },
  },

  basement: {
    name: 'The Basement',
    text() {
      return 'The keycard reader blinks green. Down a narrow stairwell, a man in a surgical gown stands over ' +
        'an operating table, waiting, as if he knew exactly when you would arrive.';
    },
    onEnter() {
      if (!S.flags.surgeonCleared) {
        startCombat('surgeon', {
          onWin: () => {
            S.flags.surgeonCleared = true;
            logEvent('The Surgeon collapses into shadow and paperwork. The way past him is finally clear.');
            goto('basement');
          },
          onFlee: null,
        });
        return true;
      }
      return false;
    },
    choices() {
      return [{ label: 'Return to the corridor', run: () => goto('corridor') }];
    },
  },

  exit_hall: {
    name: 'The Exit',
    text() {
      return 'The EXIT sign burns steady red at last. Between you and the door, the air folds in on itself ' +
        'and becomes a woman in a matron’s coat, taller than the doorway should allow.';
    },
    onEnter() {
      if (!S.flags.matronCleared) {
        startCombat('matron', {
          onWin: () => {
            S.flags.matronCleared = true;
            endGame();
          },
          onFlee: null,
        });
        return true;
      }
      return false;
    },
    choices() { return []; },
  },
};

/* ---------------- Navigation ---------------- */

function goto(roomId) {
  S.room = roomId;
  const room = ROOMS[roomId];
  if (room.onEnter) {
    const handledEnding = room.onEnter();
    if (handledEnding) return;
  }
  if (S.screen !== 'end') renderExplore();
}

/* ---------------- Combat engine ---------------- */

function startCombat(enemyKey, opts) {
  const def = ENEMIES[enemyKey];
  S.combat = {
    key: enemyKey,
    name: def.name,
    hp: def.maxHp,
    maxHp: def.maxHp,
    canFlee: def.canFlee,
    phase2: false,
    defending: false,
    locked: false,
    onWin: opts.onWin,
    onFlee: opts.onFlee,
  };
  S.screen = 'combat';
  showScreen('screen-combat');
  clearCombatLog();
  logCombat(`${def.name} blocks your way.`, 'warn');
  renderCombat();
}

function currentEnemyDef() { return ENEMIES[S.combat.key]; }

function enemyMovePool() {
  const def = currentEnemyDef();
  let pool = def.moves.slice();
  if (S.combat.phase2 && def.phase2Moves) pool = pool.concat(def.phase2Moves);
  return pool;
}

function playerAction(kind) {
  if (!S.combat || S.combat.locked) return;
  const c = S.combat;

  if (kind === 'item') {
    toggleItemMenu();
    return;
  }

  c.locked = true;
  hideItemMenu();

  if (kind === 'attack') {
    const dmg = rand(S.weapon.dmg[0], S.weapon.dmg[1]);
    c.hp = clamp(c.hp - dmg, 0, c.maxHp);
    logCombat(`You strike with the ${S.weapon.name} for ${dmg} damage.`, 'you');
    c.defending = false;
  } else if (kind === 'defend') {
    c.defending = true;
    restoreSanity(2);
    logCombat('You steady your breathing and brace yourself. (+2 Sanity)', 'you');
  } else if (kind === 'flee') {
    if (!c.canFlee) {
      logCombat('There is no leaving this room until it is finished.', 'warn');
      c.defending = false;
    } else if (Math.random() < 0.75) {
      logCombat('You bolt for the door and make it out.', 'you');
      renderCombat();
      const fleeTarget = c.onFlee || 'corridor';
      setTimeout(() => { S.combat = null; goto(fleeTarget); }, 700);
      return;
    } else {
      logCombat('You can’t get free in time.', 'warn');
      c.defending = false;
    }
  }

  renderCombat();

  if (c.hp <= 0) {
    setTimeout(() => winCombat(), 600);
    return;
  }

  setTimeout(() => enemyTurn(), 700);
}

function useItem(key) {
  if (!S.combat || S.combat.locked) return;
  if (!S.items[key]) return;
  const c = S.combat;
  c.locked = true;
  hideItemMenu();

  S.items[key] -= 1;
  if (key === 'bandage') {
    healPlayer(12);
    logCombat('You wrap the wound. (+12 HP)', 'you');
  } else if (key === 'sedative') {
    restoreSanity(10);
    logCombat('You swallow the pill dry. (+10 Sanity)', 'you');
  }
  c.defending = false;
  renderCombat();
  setTimeout(() => enemyTurn(), 700);
}

function enemyTurn() {
  const c = S.combat;
  if (!c) return;

  if (!c.phase2 && c.hp <= c.maxHp / 2 && currentEnemyDef().phase2Moves) {
    c.phase2 = true;
    logCombat(`${c.name} changes. Something worse is looking at you now.`, 'warn');
  }

  const move = weightedPick(enemyMovePool());
  let hpDmg = move.hp ? rand(move.hp[0], move.hp[1]) : 0;
  const snDmg = move.sn ? rand(move.sn[0], move.sn[1]) : 0;

  if (move.heal) {
    const h = rand(move.heal[0], move.heal[1]);
    c.hp = clamp(c.hp + h, 0, c.maxHp);
    logCombat(`${move.text} (+${h} HP for it)`, 'enemy');
  } else {
    if (c.defending) hpDmg = Math.round(hpDmg * 0.4);
    logCombat(move.text, 'enemy');
    if (hpDmg > 0) damagePlayer(hpDmg);
    if (snDmg > 0) drainSanity(snDmg);
    if (hpDmg > 0) logCombat(`You take ${hpDmg} damage.`, 'warn');
    if (snDmg > 0) logCombat(`Your grip on reality slips. (-${snDmg} Sanity)`, 'warn');
  }

  c.defending = false;
  c.locked = false;
  renderCombat();
  checkVitals();
}

function winCombat() {
  const onWin = S.combat.onWin;
  logCombat('It stops moving.', 'you');
  S.combat = null;
  setTimeout(() => { if (onWin) onWin(); }, 500);
}

/* ---------------- Vitals / endings ---------------- */

function checkVitals() {
  if (S.hp <= 0) {
    endGame('death');
    return true;
  }
  if (S.sanity <= 0) {
    endGame('madness');
    return true;
  }
  return false;
}

function endGame(forcedKind) {
  S.combat = null;
  S.screen = 'end';
  showScreen('screen-end');

  let title, text;
  if (forcedKind === 'death') {
    title = 'YOU DIED';
    text = 'The corridor keeps its newest resident. Somewhere, a chart is updated with your name and a ' +
      'date that hasn’t happened yet.';
  } else if (forcedKind === 'madness') {
    title = 'NOTHING LEFT TO LOSE';
    text = 'You stop being able to tell the doors from the walls. The hospital doesn’t need to hold you ' +
      'anymore — you’ve started holding yourself here.';
  } else {
    const sanityPct = S.sanity / S.maxSanity;
    if (sanityPct >= 0.5) {
      title = 'TRUE ESCAPE';
      text = 'The doors open onto an ordinary parking lot under an ordinary grey sky. You do not look back ' +
        'to check whether the building is still there. You already know better.';
    } else {
      title = 'A HOLLOW ESCAPE';
      text = 'You walk out into the daylight. People say your name and you almost remember what it means. ' +
        'Something you left inside is still walking the corridor without you.';
    }
  }

  document.getElementById('end-title').textContent = title;
  document.getElementById('end-text').textContent = text;
}

/* ---------------- Rendering ---------------- */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.body.classList.toggle('unstable', isUnstable());
}

function setBar(fillId, textId, value, max) {
  const pct = clamp((value / max) * 100, 0, 100);
  document.getElementById(fillId).style.width = pct + '%';
  document.getElementById(textId).textContent = `${value}/${max}`;
}

function renderExplore() {
  S.screen = 'explore';
  showScreen('screen-explore');
  const room = ROOMS[S.room];

  setBar('hp-fill', 'hp-text', S.hp, S.maxHp);
  setBar('sn-fill', 'sn-text', S.sanity, S.maxSanity);

  document.getElementById('room-name').textContent = room.name;
  document.getElementById('room-text').textContent = room.text();

  const choiceBox = document.getElementById('room-choices');
  choiceBox.innerHTML = '';
  room.choices().forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = ch.label;
    btn.onclick = ch.run;
    choiceBox.appendChild(btn);
  });

  const invBox = document.getElementById('inventory-list');
  invBox.innerHTML = '';
  const invLines = [];
  invLines.push(`${S.weapon.name} (equipped)`);
  Object.keys(ITEM_DEFS).forEach(k => {
    if (S.items[k] > 0) invLines.push(`${ITEM_DEFS[k].name} x${S.items[k]}`);
  });
  invLines.forEach(line => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.textContent = line;
    invBox.appendChild(row);
  });
}

function logEvent(text) {
  const box = document.getElementById('event-log');
  const line = document.createElement('div');
  line.className = 'log-line';
  line.textContent = text;
  box.appendChild(line);
}

function clearCombatLog() {
  document.getElementById('combat-log').innerHTML = '';
}

function logCombat(text, cls) {
  const box = document.getElementById('combat-log');
  const line = document.createElement('div');
  line.className = 'combat-line' + (cls ? ' ' + cls : '');
  line.textContent = text;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

function renderCombat() {
  const c = S.combat;
  if (!c) return;

  setBar('hp-fill-c', 'hp-text-c', S.hp, S.maxHp);
  setBar('sn-fill-c', 'sn-text-c', S.sanity, S.maxSanity);

  document.getElementById('enemy-glyph').innerHTML = ENEMY_ART[c.key];
  document.getElementById('enemy-name').textContent = c.name;
  setBar('en-fill', 'en-text', c.hp, c.maxHp);

  if (isUnstable()) {
    const jitter = Math.max(0, c.hp + rand(-3, 3));
    document.getElementById('en-text').textContent = `${jitter}/${c.maxHp}?`;
  }

  document.body.classList.toggle('unstable', isUnstable());

  document.querySelectorAll('#combat-actions .action').forEach(btn => {
    btn.disabled = c.locked;
  });

  renderItemMenu();
}

function renderItemMenu() {
  const box = document.getElementById('item-menu');
  box.innerHTML = '';
  Object.keys(ITEM_DEFS).forEach(k => {
    if (S.items[k] > 0) {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = `${ITEM_DEFS[k].name} x${S.items[k]} — ${ITEM_DEFS[k].desc}`;
      btn.onclick = () => useItem(k);
      box.appendChild(btn);
    }
  });
  const cancel = document.createElement('button');
  cancel.className = 'btn';
  cancel.textContent = 'Cancel';
  cancel.onclick = hideItemMenu;
  box.appendChild(cancel);
}

function toggleItemMenu() {
  const box = document.getElementById('item-menu');
  box.classList.toggle('hidden');
}
function hideItemMenu() {
  document.getElementById('item-menu').classList.add('hidden');
}

/* ---------------- Boot ---------------- */

function startGame() {
  S = freshState();
  S.screen = 'explore';
  showScreen('screen-explore');
  goto('intake');
}

document.getElementById('btn-start').onclick = startGame;
document.getElementById('btn-restart').onclick = startGame;

document.querySelectorAll('#combat-actions .action').forEach(btn => {
  btn.addEventListener('click', () => playerAction(btn.dataset.act));
});

showScreen('screen-title');
