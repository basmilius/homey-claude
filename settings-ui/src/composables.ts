export function useTranslate() {
    return (key: string) => Homey.__(key) ?? key;
}
