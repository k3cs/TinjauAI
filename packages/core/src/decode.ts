import { AbiCoder, getAddress } from "ethers";

const coder = AbiCoder.defaultAbiCoder();

export interface DecodedLog {
  address: string;
  topics: string[];
  data: string;
}

export interface DecodedTx {
  txType: number;
  from: string;
  to: string | null;
  status: number;
  logs: DecodedLog[];
}

/**
 * Decode prover `txBytes`: `abi.encode(uint8 txType, bytes[] chunks)` where chunk 0 holds the common
 * tx fields and the last chunk the receipt (EvmV1Decoder layout, @gluwa/usc-contracts 0.2.0).
 */
export function decodeTxBytes(txBytes: string): DecodedTx {
  const [txTypeRaw, chunks] = coder.decode(["uint8", "bytes[]"], txBytes) as unknown as [bigint, string[]];
  const txType = Number(txTypeRaw);
  if (txType > 4) throw new Error(`unsupported tx type ${txType}`);
  const expected = txType <= 2 ? 3 : 4;
  if (chunks.length !== expected) throw new Error(`bad chunk count ${chunks.length} for type ${txType}`);

  const common = coder.decode(["uint64", "uint64", "address", "bool", "address", "uint256", "bytes"], chunks[0]);
  const receipt = coder.decode(["uint8", "uint64", "tuple(address,bytes32[],bytes)[]", "bytes"], chunks[expected - 1]);
  const logs = (receipt[2] as unknown as [string, string[], string][]).map(([address, topics, data]) => ({
    address: getAddress(address),
    topics: [...topics],
    data,
  }));
  return {
    txType,
    from: getAddress(common[2] as string),
    to: (common[3] as boolean) ? null : getAddress(common[4] as string),
    status: Number(receipt[0]),
    logs,
  };
}

export function topicToAddress(topic: string): string {
  return getAddress("0x" + topic.slice(-40));
}

export function topicToBigInt(topic: string): bigint {
  return BigInt(topic);
}

/** First two words of NewFeedback data: (uint64 feedbackIndex, int128 value). */
export function decodeFeedbackData(data: string): { index: bigint; value: bigint } {
  const [index, value] = coder.decode(["uint64", "int128"], data.slice(0, 2 + 128));
  return { index: index as bigint, value: value as bigint };
}

export function decodeRegisteredUri(data: string): string {
  return coder.decode(["string"], data)[0] as string;
}
