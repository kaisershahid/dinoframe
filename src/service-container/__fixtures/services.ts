import {Activate, Deactivate, Inject, Service} from "../decorators";

interface Actor {
    getName(): string;

    getRole(): string;
}

@Service('tobias', {
    interfaces: ['actor']
})
export class TobiasTheActor implements Actor {
    getName() {
        return 'tobias';
    }

    getRole() {
        return 'actor';
    }
}

@Service('gob', {
    interfaces: ['actor'],
    priority: 100
})
export class GobTheMagician implements Actor {
    activated = false;

    getName() {
        return `gob ${this.activated ? 'wake' : 'sleep'}`;
    }

    getRole() {
        return 'magician';
    }

    @Activate
    activate() {
        console.log("!!! activatng");
        this.activated = true;
    }

    @Deactivate
    deactivate() {
        this.activated = false;
    }
}

@Service('agent', {
    priority: -1 // ensures actors load first
})
export class Agent {
    actors: Actor[] = [];
    rollCall: string[] = [];

    setActors(@Inject({matchInterface: 'actor', matchCriteria: {min: 2}}) actors: Actor[]) {
        this.actors = actors;
    }

    @Deactivate
    deactivate() {
        this.rollCall = [];
        this.actors = [];
    }

    getRoleCall() {
        return this.actors.map(actor => `my name is ${actor.getName()} and i'm a ${actor.getRole()}`);
    }

    static discover() {
    }
}
