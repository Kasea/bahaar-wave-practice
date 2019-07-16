const wave_data = {
    // left (normal/firelord/scream)
    21: {
        anim: [750, 1100, 830, 805, 686, 925, 1012],
        wave: [false, false, [560, 1402], [580, 1401], [550, 1402], [600, 1401], false]
    },
    22: {
        anim: [750, 1100, 830, 805, 386, 925, 1012],
        wave: [false, false, [580, 1402], [590, 1401], [230, 1402], [630, 1401], false]
    },
    23: {
        anim: [750, 1100, 705, 630, 686, 925, 1012],
        wave: [false, false, [570, 1402], [350, 1401], [540, 1402], [650, 1401], false]
    },

    // right (normal/firelord/scream)
    40: {
        anim: [750, 1100, 805, 830, 805, 525, 400, 1012, 833],
        wave: [false, false, [580, 1401], [550, 1402], [550, 1401], [34, 1402], false, false, false]
    },
    41: {
        anim: [750, 1100, 765, 665, 725, 550, 375, 1012, 833],
        wave: [false, false, [600, 1401], [600, 1402], [450, 1401], [510, 1402], false, false, false]
    },
    42: {
        anim: [750, 1100, 680, 675, 785, 525, 400, 1012, 833],
        wave: [false, false, [590, 1401], [400, 1402], [510, 1401], [46, 1402], false, false, false]
    }
};

const skill_ids_that_are_waves = [1121, 2121, 1122, 2122, 1123, 2123, 1140, 2140, 1141, 2141, 1142, 2142];
const projectile_skill_ids_that_are_waves = [1401, 1402, 2401, 2402];
// how long waves are alive for
const wave_timeline = 2500;
// how long to wait until after s_action_stage to spawn wave(s)
const spawn_wave_delay = 0;

class BahaarWaveEmulation {
    constructor(dispatch) {
        //const ping = dispatch.require.ping;
        const { player } = dispatch.require.library;

        let my_info = {
            "hooks": [],
            "load_topo_hook": null,
            "w": 0,
            "enabled": true,
            "pos": {},
            "recieved_action_stage": 0
        };

        const add_hook = (...args) => my_info['hooks'].push(dispatch.hook(...args));

        dispatch.command.add('bahaar', (sub_command)=> {
            if(!sub_command) {
                my_info['enabled'] = !my_info['enabled'];
                dispatch.command.message(`Bahaar wave module has been ${my_info['enabled'] ? "enabled" : "disabled"}`);
            }
            

            switch(sub_command) {
                case "summon": {
                    my_info['pos'] = player.loc.clone();
                    my_info['w'] = player.loc.w;

                    dispatch.send('S_SPAWN_NPC', 11, Object.assign({}, {
                        gameId: 420133769,
                        templateId: 2000,
                        huntingZoneId: 444,
                        shapeId: 303520,
                        hpLevel: 2,
                        status: 2,
                        visible: true,
                        loc: my_info['pos'],
                        w: my_info['w']
                    }));
                    
                    break;
                }
                case "wave": {
                    const skill_id = skill_ids_that_are_waves[Math.floor(Math.random() * skill_ids_that_are_waves.length)];
                    let e = {
                        gameId: 420133769,
                        loc: my_info['pos'],
                        w: my_info['w'],
                        templateId: 2000,
                        skill: {
                            id: skill_id,
                            type: 1,
                            npc: true,
                            huntingZoneId: 444,
                            reserved: 0
                        },
                        stage: 0,
                        speed: 1,
                        projectileSpeed: 1,
                        id: 3495023853,
                        effectScale: 1,
                        dest: my_info['pos']
                    };
                    dispatch.send('S_ACTION_END', 5, e)
                    dispatch.send('S_ACTION_STAGE', 8, e);
                    setTimeout(()=> {
                        dispatch.send('S_ACTION_END', 5, e)
                    }, 5000);
                    s_action_stage(e);

                    // print out in command chat which wave it is
                    if([22, 41].includes(skill_id % 50)) dispatch.command.message("firelord");
                    else if([23, 42].includes(skill_id % 50)) dispatch.command.message("scream");
                    else dispatch.command.message("normal");
                    break;
                }
            }
        });

        function send_action_stage(e, stage) {
            dispatch.send('S_ACTION_STAGE', 8, Object.assign({}, e, my_info['pos'], {
                w: my_info['w'],
                stage
            }));
        }

        function send_spawn_projectile(e, skill) {
            dispatch.send('S_SPAWN_PROJECTILE', 5, Object.assign({}, e, my_info['pos'], {
                w: my_info['w'],
                skill: {
                    id: skill,
                    huntingZoneId: 444,
                    type: 1,
                    npc: true,
                    reserved: 0
                },
                unk1: 444
            }));
        }

        function print(...args) {
            console.log(Date.now(), ":", ...args);
        }

        function s_action_stage(e) {
            if(my_info['enabled'] && e.templateId === 2000 && skill_ids_that_are_waves.includes(e.skill.id)) {
                //print("S_ACTION_STAGE", "skill:", e.skill.id, "stage:", e.stage, "delay:", Date.now() - my_info['recieved_action_stage']);
                my_info['w'] = e.w;
                my_info['recieved_action_stage'] = Date.now();

                // not first stage, we don't want this fucking shit
                if(e.stage) return false;

                // get the wave array
                const wave_array = wave_data[e.skill.id % 50]['anim'];
                //const projectile_array = wave_data[e.skill.id % 50]['wave'];

                // get initial wave delay (minus ping and jitter)
                let delay = wave_array[0] // - ping.ping - ping.jitter;

                for(let stage = 1; stage < wave_array.length; stage++) {
                    const wave_delay = wave_array[stage];
                    
                    setTimeout(send_action_stage, delay, e, stage);
                    //if(projectile_array[stage]) setTimeout(send_spawn_projectile, delay + projectile_array[stage][0], e, projectile_array[stage][1]);

                    delay += wave_delay;
                }
            }
        }

        function s_spawn_projectile(e) {
            if(e.templateId == 2000) {
                print("S_SPAWN_PROJECTILE", "skill:", e.skill.id, "delay:", Date.now() - my_info['recieved_action_stage']);
                
                // block servers waves
                if(projectile_skill_ids_that_are_waves.includes(e.skill.id)) return false;
            }
        }

        function s_load_topo(e) {
            if(e.zone == 9044 && !my_info['hooks'].length) enable();
            else if (e.zone != 9044) disable();
        }
        //my_info['load_topo_hook'] = dispatch.hook('S_LOAD_TOPO', 3, s_load_topo);

        function enable() {
            add_hook('S_ACTION_STAGE', 8, {order: 100}, s_action_stage);
            //add_hook('S_SPAWN_PROJECTILE', 5, s_spawn_projectile);
        }

        function disable() {
            for(const idx in my_info['hooks']) dispatch.unhook(my_info['hooks'][idx]);
            my_info['hooks'] = [];
        }


        this.destructor = () => {
            disable();
            dispatch.unhook(my_info['load_topo_hook']);
            dispatch.command.remove('bahaar');
        };
    }
}

module.exports = BahaarWaveEmulation;