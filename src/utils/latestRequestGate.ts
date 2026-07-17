export class LatestRequestGate {
  private currentRequestId = 0;

  begin(): number {
    this.currentRequestId += 1;
    return this.currentRequestId;
  }

  isCurrent(requestId: number): boolean {
    return requestId === this.currentRequestId;
  }
}
