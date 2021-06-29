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
    interfaces: ['actor']
})
export class GobTheMagician implements Actor {
    getName() {
        return 'gob';
    }

    getRole() {
        return 'magician';
    }
}

@Service('manager', {
    priority: -1 // ensures actors load first
})
export class Manager {
    actors: Actor[] = [];
    rollCall: string[] = [];

    setActors(@Inject({interfaces: ['actor']}) actors) {
        this.actors = actors;
    }

    @Activate
    activate() {
        this.rollCall = this.actors.map(actor => `my name is ${actor.getName()} and i'm a ${actor.getRole()}`)
    }

    @Deactivate
    deactivate() {
        this.rollCall = [];
        this.actors = [];
    }

    getRoleCall() {
        return [...this.rollCall]
    }
}
