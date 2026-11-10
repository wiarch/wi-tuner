import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import {
    createTemperamentExchange,
    downloadTemperamentJson,
} from "./temperament-exchange";

const directory = Directory.Cache;

export const temperamentExchange = createTemperamentExchange({
    isNative: () => Capacitor.isNativePlatform(),
    async write(filename, contents) {
        await Filesystem.writeFile({
            path: filename,
            data: contents,
            directory,
            encoding: Encoding.UTF8,
        });
    },
    async read(filename) {
        const result = await Filesystem.readFile({
            path: filename,
            directory,
            encoding: Encoding.UTF8,
        });
        if (typeof result.data !== "string")
            throw new Error("Temperament file was not text.");
        return result.data;
    },
    async share(filename) {
        const { uri } = await Filesystem.getUri({ path: filename, directory });
        await Share.share({
            title: filename,
            files: [uri],
            dialogTitle: filename,
        });
    },
    download: downloadTemperamentJson,
});
