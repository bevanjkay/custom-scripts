export interface FluroResponse {
    data: any[];
}

export interface Schedule {
    title: string;
    key: string;
    notes: Record<string, string>;
}

export interface Plan {
    schedules: Schedule[];
}