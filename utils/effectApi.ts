import { SkillType } from '../types';

// Returns high-quality reliable transparent/black-background effect GIFs instantly
export const fetchAttackEffect = async (skillType: SkillType): Promise<string> => {
  const effects: Record<SkillType, string[]> = {
    [SkillType.BASIC]: [
      "https://media.tenor.com/2sHwV6A055IAAAAj/slash-anime.gif",
      "https://media.tenor.com/B1YgMh6L9d8AAAAi/impact-effect.gif",
      "https://media.tenor.com/a6bX6tE4_CgAAAAi/hit-slap.gif"
    ],
    [SkillType.HEAVY]: [
      "https://media.tenor.com/GzB6L_s5k60AAAAi/explosion-boom.gif",
      "https://media.tenor.com/k45dI8E_eJ8AAAAj/explosion-boom.gif",
      "https://media.tenor.com/1Gf-t-nZ04sAAAAj/explosion-anime.gif"
    ],
    [SkillType.DEFEND]: [
      "https://media.tenor.com/E8w9W4wU2bMAAAAi/force-field-shield.gif",
      "https://media.tenor.com/Ntz01kZ72l0AAAAj/magic-circle.gif",
      "https://media.tenor.com/5J3m0Xj98mAAAAAj/shield-defend.gif"
    ],
    [SkillType.ULTIMATE]: [
      "https://media.tenor.com/bK1RSx61QzUAAAAj/lightning-strike.gif",
      "https://media.tenor.com/y1O05l9WpB8AAAAi/beam-laser.gif",
      "https://media.tenor.com/39_Q-o71uB0AAAAi/energy-ball.gif",
      "https://media.tenor.com/mO_PzD82eB8AAAAj/anime-blast.gif"
    ]
  };

  const list = effects[skillType] || effects[SkillType.BASIC];
  return list[Math.floor(Math.random() * list.length)];
};
