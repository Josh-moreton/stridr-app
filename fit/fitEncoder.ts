import { FitFileData, FitGenerationResult } from "../@types/fit";

/**
 * FIT file encoder based on Garmin FIT SDK specification
 * Generates binary FIT files that can be loaded on Garmin devices
 */
export class FitEncoder {
  private static readonly FIT_SIGNATURE = 0x464954; // '.FIT'
  private static readonly PROTOCOL_VERSION = 0x10; // 1.0
  private static readonly PROFILE_VERSION = 2132; // 21.32

  /**
   * Encode FIT file data into binary format
   */
  static encode(fitData: FitFileData): FitGenerationResult {
    try {
      const encoder = new FitEncoder();
      const fitFile = encoder.createFitFile(fitData);
      
      return {
        success: true,
        fitFile,
        filename: `${fitData.workout.wktName.replace(/[^a-zA-Z0-9]/g, '_')}.fit`,
        metadata: {
          workoutName: fitData.workout.wktName,
          sport: this.getSportName(fitData.workout.sport),
          stepCount: fitData.workoutSteps.length,
          duration: this.calculateTotalDuration(fitData.workoutSteps),
          distance: this.calculateTotalDistance(fitData.workoutSteps)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private createFitFile(fitData: FitFileData): Uint8Array {
    const dataMessages: Uint8Array[] = [];
    
    // 1. File ID message
    dataMessages.push(this.createFileIdMessage(fitData.fileId));
    
    // 2. Workout message
    dataMessages.push(this.createWorkoutMessage(fitData.workout));
    
    // 3. Workout step messages
    fitData.workoutSteps.forEach(step => {
      dataMessages.push(this.createWorkoutStepMessage(step));
    });

    // Calculate total data size
    const totalDataSize = dataMessages.reduce((sum, msg) => sum + msg.length, 0);
    
    // Create header
    const header = this.createHeader(totalDataSize);
    
    // Combine header and data
    const headerAndData = new Uint8Array(header.length + totalDataSize);
    headerAndData.set(header, 0);
    
    let offset = header.length;
    dataMessages.forEach(msg => {
      headerAndData.set(msg, offset);
      offset += msg.length;
    });
    
    // Calculate and append CRC
    const crc = this.calculateCRC(headerAndData);
    const result = new Uint8Array(headerAndData.length + 2);
    result.set(headerAndData, 0);
    result.set(this.uint16ToBytes(crc), headerAndData.length);
    
    return result;
  }

  private createHeader(dataSize: number): Uint8Array {
    const header = new Uint8Array(14);
    let offset = 0;

    // Header size (1 byte)
    header[offset++] = 14;
    
    // Protocol version (1 byte)
    header[offset++] = FitEncoder.PROTOCOL_VERSION;
    
    // Profile version (2 bytes, little endian)
    const profileBytes = this.uint16ToBytes(FitEncoder.PROFILE_VERSION);
    header[offset++] = profileBytes[0];
    header[offset++] = profileBytes[1];
    
    // Data size (4 bytes, little endian)
    const dataSizeBytes = this.uint32ToBytes(dataSize);
    header[offset++] = dataSizeBytes[0];
    header[offset++] = dataSizeBytes[1];
    header[offset++] = dataSizeBytes[2];
    header[offset++] = dataSizeBytes[3];
    
    // .FIT signature (4 bytes)
    const signatureBytes = this.uint32ToBytes(FitEncoder.FIT_SIGNATURE);
    header[offset++] = signatureBytes[0];
    header[offset++] = signatureBytes[1];
    header[offset++] = signatureBytes[2];
    header[offset++] = signatureBytes[3];
    
    // Header CRC (2 bytes)
    const headerCrc = this.calculateCRC(header.slice(0, 12));
    const crcBytes = this.uint16ToBytes(headerCrc);
    header[offset++] = crcBytes[0];
    header[offset++] = crcBytes[1];

    return header;
  }

  private createFileIdMessage(fileId: any): Uint8Array {
    // Message header (1 byte): 0x40 (definition message)
    // Local message type: 0
    const definition = new Uint8Array([
      0x40, // Definition message header
      0x00, // Reserved
      0x00, // Architecture (little endian)
      0x00, 0x00, // Global message number (file_id = 0)
      0x05, // Number of fields
      // Field definitions
      0x00, 0x01, 0x02, // type field: field #0, size 1, base type enum
      0x01, 0x02, 0x02, // manufacturer field: field #1, size 2, base type uint16
      0x02, 0x02, 0x02, // product field: field #2, size 2, base type uint16
      0x03, 0x04, 0x02, // serial_number field: field #3, size 4, base type uint32z
      0x04, 0x04, 0x02  // time_created field: field #4, size 4, base type uint32
    ]);

    // Data message
    const data = new Uint8Array([
      0x00, // Data message header (local message type 0)
      fileId.type,
      ...this.uint16ToBytes(fileId.manufacturer),
      ...this.uint16ToBytes(fileId.product),
      ...this.uint32ToBytes(fileId.serialNumber),
      ...this.uint32ToBytes(fileId.timeCreated)
    ]);

    // Combine definition and data
    const message = new Uint8Array(definition.length + data.length);
    message.set(definition, 0);
    message.set(data, definition.length);
    
    return message;
  }

  private createWorkoutMessage(workout: any): Uint8Array {
    // Definition message for workout (global message number 26)
    const nameBytes = this.stringToBytes(workout.wktName, 16);
    
    const definition = new Uint8Array([
      0x41, // Definition message header + local message type 1
      0x00, // Reserved
      0x00, // Architecture
      0x1A, 0x00, // Global message number (workout = 26)
      0x04, // Number of fields
      // Field definitions
      0x08, 0x10, 0x07, // wkt_name field: field #8, size 16, base type string
      0x04, 0x01, 0x02, // sport field: field #4, size 1, base type enum
      0x05, 0x01, 0x02, // sub_sport field: field #5, size 1, base type enum  
      0x06, 0x02, 0x02  // num_valid_steps field: field #6, size 2, base type uint16
    ]);

    const data = new Uint8Array([
      0x01, // Data message header (local message type 1)
      ...nameBytes,
      workout.sport,
      workout.subSport || 0,
      ...this.uint16ToBytes(workout.numValidSteps)
    ]);

    const message = new Uint8Array(definition.length + data.length);
    message.set(definition, 0);
    message.set(data, definition.length);
    
    return message;
  }

  private createWorkoutStepMessage(step: any): Uint8Array {
    // Definition message for workout_step (global message number 27)
    const definition = new Uint8Array([
      0x42, // Definition message header + local message type 2
      0x00, // Reserved
      0x00, // Architecture
      0x1B, 0x00, // Global message number (workout_step = 27)
      0x07, // Number of fields
      // Field definitions
      0x00, 0x02, 0x02, // message_index field: field #0, size 2, base type uint16
      0x01, 0x01, 0x02, // intensity field: field #1, size 1, base type enum
      0x02, 0x01, 0x02, // duration_type field: field #2, size 1, base type enum
      0x03, 0x04, 0x02, // duration_value field: field #3, size 4, base type uint32
      0x04, 0x01, 0x02, // target_type field: field #4, size 1, base type enum
      0x05, 0x04, 0x02, // target_value field: field #5, size 4, base type uint32
      0x07, 0x10, 0x07  // wkt_step_name field: field #7, size 16, base type string
    ]);

    const nameBytes = this.stringToBytes(step.wktStepName || '', 16);
    
    // Calculate duration value based on type
    let durationValue = 0;
    if (step.durationTime) {
      durationValue = step.durationTime * 1000; // Convert to milliseconds
    } else if (step.durationDistance) {
      durationValue = Math.round(step.durationDistance * 100); // Convert to centimeters
    }

    // Calculate target value
    let targetValue = 0;
    if (step.targetHrZone) {
      targetValue = step.targetHrZone;
    } else if (step.targetPowerZone) {
      targetValue = step.targetPowerZone;
    } else if (step.targetSpeedZone) {
      targetValue = step.targetSpeedZone;
    }

    const data = new Uint8Array([
      0x02, // Data message header (local message type 2)
      ...this.uint16ToBytes(step.messageIndex),
      step.intensity,
      step.durationType,
      ...this.uint32ToBytes(durationValue),
      step.targetType,
      ...this.uint32ToBytes(targetValue),
      ...nameBytes
    ]);

    const message = new Uint8Array(definition.length + data.length);
    message.set(definition, 0);
    message.set(data, definition.length);
    
    return message;
  }

  private uint16ToBytes(value: number): Uint8Array {
    return new Uint8Array([value & 0xFF, (value >> 8) & 0xFF]);
  }

  private uint32ToBytes(value: number): Uint8Array {
    return new Uint8Array([
      value & 0xFF,
      (value >> 8) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 24) & 0xFF
    ]);
  }

  private stringToBytes(str: string, maxLength: number): Uint8Array {
    const bytes = new Uint8Array(maxLength);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    
    const length = Math.min(encoded.length, maxLength - 1);
    bytes.set(encoded.slice(0, length), 0);
    bytes[length] = 0; // Null terminator
    
    return bytes;
  }

  private calculateCRC(data: Uint8Array): number {
    const crcTable = this.generateCRCTable();
    let crc = 0;
    
    for (let i = 0; i < data.length; i++) {
      crc = crcTable[((crc & 0xFF) ^ data[i]) & 0xFF] ^ (crc >> 8);
    }
    
    return crc & 0xFFFF;
  }

  private generateCRCTable(): number[] {
    const table: number[] = [];
    
    for (let i = 0; i < 256; i++) {
      let crc = i;
      for (let j = 0; j < 8; j++) {
        if ((crc & 1) === 1) {
          crc = (crc >> 1) ^ 0xA001;
        } else {
          crc = crc >> 1;
        }
      }
      table[i] = crc;
    }
    
    return table;
  }

  private static getSportName(sport: number): string {
    const sportNames: Record<number, string> = {
      0: 'Generic',
      1: 'Running',
      2: 'Cycling',
      3: 'Transition',
      4: 'Fitness Equipment',
      5: 'Swimming',
      10: 'Training',
      11: 'Walking'
    };
    return sportNames[sport] || 'Unknown';
  }

  private static calculateTotalDuration(steps: any[]): number | undefined {
    let totalSeconds = 0;
    let hasTime = false;
    
    for (const step of steps) {
      if (step.durationTime) {
        totalSeconds += step.durationTime;
        hasTime = true;
      }
    }
    
    return hasTime ? totalSeconds : undefined;
  }

  private static calculateTotalDistance(steps: any[]): number | undefined {
    let totalMeters = 0;
    let hasDistance = false;
    
    for (const step of steps) {
      if (step.durationDistance) {
        totalMeters += step.durationDistance;
        hasDistance = true;
      }
    }
    
    return hasDistance ? totalMeters : undefined;
  }
}
