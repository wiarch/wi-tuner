import { describe, expect, it } from "vitest";

import {
    MetronomeConductor,
    type MetronomeClock,
    type MetronomeOutput,
} from "../src/audio/metronome-engine";
import type { MetronomeTick } from "@wi-tuner/dsp-core";

class SimulatedClock implements MetronomeClock {
    audioTime = 0;
    private nextId = 1;
    private timers = new Map<
        number,
        { callback: () => void; interval: number; next: number }
    >();

    audioNow = () => this.audioTime;

    setInterval = (callback: () => void, intervalMs: number) => {
        const id = this.nextId++;
        const interval = intervalMs / 1000;
        this.timers.set(id, {
            callback,
            interval,
            next: this.audioTime + interval,
        });
        return id;
    };

    clearInterval = (id: unknown) => {
        this.timers.delete(id as number);
    };

    advance(seconds: number): void {
        const end = this.audioTime + seconds;
        while (true) {
            const next = [...this.timers.values()]
                .filter((timer) => timer.next <= end + 1e-9)
                .sort((a, b) => a.next - b.next)[0];
            if (!next) break;
            this.audioTime = next.next;
            next.next += next.interval;
            next.callback();
        }
        this.audioTime = end;
    }

    /** Move the audio clock without polling, then take one late poll. */
    elapseWithoutPolling(seconds: number): void {
        this.audioTime += seconds;
        for (const timer of this.timers.values()) {
            timer.next = this.audioTime + timer.interval;
            timer.callback();
        }
    }
}

function recording(): {
    output: MetronomeOutput;
    times: number[];
    ticks: MetronomeTick[];
} {
    const times: number[] = [];
    const ticks: MetronomeTick[] = [];
    const output: MetronomeOutput = {
        play(tick) {
            times.push(tick.time);
            ticks.push(tick);
        },
        pulse() {},
        setAwake() {},
    };
    return { output, times, ticks };
}

describe("metronome conductor", () => {
    it("stays on the audio grid for a long session with a jittered poll", () => {
        const clock = new SimulatedClock();
        const { output, times } = recording();
        const conductor = new MetronomeConductor(clock, output, {
            bpm: 120,
            beatsPerBar: 4,
            subdivision: 1,
            accents: [true, false, false, false],
        });
        conductor.start();
        const steps = [0.01, 0.04, 0.017, 0.033, 0.02, 0.028];
        let elapsed = 0;
        const sessionSeconds = 10 * 60;
        while (elapsed < sessionSeconds) {
            const step =
                steps[Math.floor(elapsed * 10) % steps.length] ?? 0.025;
            clock.advance(step);
            elapsed += step;
        }
        const interval = 60 / 120;
        expect(times.length).toBeGreaterThan(sessionSeconds * 2 - 3);
        times.forEach((time, index) => {
            expect(Math.abs(time - index * interval)).toBeLessThan(0.001);
        });
        const last = times.at(-1) ?? 0;
        const nearest = Math.round(last / interval) * interval;
        expect(Math.abs(last - nearest)).toBeLessThan(0.001);
        conductor.stop();
        const stopped = times.length;
        clock.advance(2);
        expect(times).toHaveLength(stopped);
    });

    it("drops late clicks after a gap and keeps the original grid", () => {
        const clock = new SimulatedClock();
        const { output, times, ticks } = recording();
        const conductor = new MetronomeConductor(clock, output, {
            bpm: 120,
            beatsPerBar: 4,
            subdivision: 2,
            accents: [true, false, true, false],
        });
        conductor.start();
        clock.advance(2);
        const before = times.length;
        clock.elapseWithoutPolling(5);
        const added = times.slice(before);
        expect(added.length).toBeLessThanOrEqual(2);
        for (const time of added) {
            const step = 60 / 120 / 2;
            const index = Math.round(time / step);
            expect(Math.abs(time - index * step)).toBeLessThan(1e-6);
            expect(time).toBeGreaterThan(clock.audioTime - 0.2);
        }
        expect(ticks.some((tick) => tick.accent)).toBe(true);
        expect(ticks.some((tick) => !tick.accent)).toBe(true);
        expect(conductor.tap(0)).toBeNull();
        expect(conductor.tap(0.5)).toBeCloseTo(120);
        conductor.stop();
    });
});
