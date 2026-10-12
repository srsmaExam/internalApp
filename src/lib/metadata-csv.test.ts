import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  generateMetadataExcel,
  generateSampleMetadataCsv,
  parseDifficulty,
  parseExpectedTime,
  parseMetadataCsv,
  parseMetadataExcel,
} from './metadata-csv';

describe('metadata-csv', () => {
  it('parses difficulty accurately', () => {
    expect(parseDifficulty('Easy')).toEqual({ level: 1, label: 'Easy' });
    expect(parseDifficulty('1')).toEqual({ level: 1, label: 'Easy' });
    expect(parseDifficulty('Medium')).toEqual({ level: 2, label: 'Medium' });
    expect(parseDifficulty('Difficult')).toEqual({ level: 3, label: 'Hard' });
    expect(parseDifficulty('Hard')).toEqual({ level: 3, label: 'Hard' });
    expect(parseDifficulty('3')).toEqual({ level: 3, label: 'Hard' });
    expect(parseDifficulty(null)).toEqual({ level: 2, label: 'Medium' });
  });

  it('parses expected time accurately', () => {
    expect(parseExpectedTime('45,60')).toEqual({ commaSeparated: '45,60', seconds: 53 });
    expect(parseExpectedTime('30-45')).toEqual({ commaSeparated: '30,45', seconds: 38 });
    expect(parseExpectedTime('90')).toEqual({ commaSeparated: '90', seconds: 90 });
    expect(parseExpectedTime(null)).toEqual({ commaSeparated: '180', seconds: 180 });
  });

  it('generates sample CSV template conforming to profiling specification', () => {
    const csv = generateSampleMetadataCsv();
    expect(csv).toContain('Question_Type,Topic,Sub_Topic,Difficulty_Granular,Difficulty_Categorical,Phase,ETA_Seconds');
    expect(csv).toContain('MCQ,3D Geometry,Distance & Lines,7,Medium,2,180');
    expect(csv).toContain('NVQ,Vector Algebra,STP Max Value,7,Medium,2,150');
  });

  it('generates pre-filled CSV template for existing questions', () => {
    const questions = [
      {
        position: 1,
        subject: 'maths',
        type: 'mcq',
        topic: '3D Geometry',
        chapter: '3D Geometry',
        difficulty: 7,
        expectedTimeS: 180,
        metadata: {
          questionType: 'MCQ',
          topic: '3D Geometry',
          subTopic: 'Distance & Lines',
          difficultyGranular: 7,
          difficultyCategorical: 'Medium',
          phase: 2,
          etaSeconds: 180,
        },
      },
    ];
    const csv = generateSampleMetadataCsv(questions);
    expect(csv).toContain('MCQ,3D Geometry,Distance & Lines,7,Medium,2,180');
  });

  it('parses valid metadata CSV conforming to profiling spec (without Qno header)', () => {
    const csv = `Question_Type,Topic,Sub_Topic,Difficulty_Granular,Difficulty_Categorical,Phase,ETA_Seconds
MCQ,3D Geometry,Distance & Lines,7,Medium,2,180
MCQ,Statistics,Altered Data,7,Medium,2,180
NVQ,Vector Algebra,STP Max Value,7,Medium,2,150`;

    const res = parseMetadataCsv(csv);
    expect(res.errors).toHaveLength(0);
    expect(res.validRows).toHaveLength(3);

    expect(res.validRows[0].qno).toBe(1);
    expect(res.validRows[0].questionType).toBe('MCQ');
    expect(res.validRows[0].topic).toBe('3D Geometry');
    expect(res.validRows[0].subTopic).toBe('Distance & Lines');
    expect(res.validRows[0].difficultyGranular).toBe(7);
    expect(res.validRows[0].difficultyCategorical).toBe('Medium');
    expect(res.validRows[0].phase).toBe(2);
    expect(res.validRows[0].etaSeconds).toBe(180);

    expect(res.validRows[2].qno).toBe(3);
    expect(res.validRows[2].questionType).toBe('NVQ');
    expect(res.validRows[2].subTopic).toBe('STP Max Value');
  });

  it('backwards compatibility: still parses CSV with legacy Test_Paper_ID header', () => {
    const csv = `Test_Paper_ID,Question_Type,Topic,Sub_Topic,Difficulty_Granular,Difficulty_Categorical,Phase,ETA_Seconds
PT_01,MCQ,3D Geometry,Distance & Lines,7,Medium,2,180
PT_01,NVQ,Vector Algebra,STP Max Value,7,Medium,2,150`;

    const res = parseMetadataCsv(csv);
    expect(res.errors).toHaveLength(0);
    expect(res.validRows).toHaveLength(2);
    expect(res.validRows[0].testPaperId).toBe('PT_01');
    expect(res.validRows[0].topic).toBe('3D Geometry');
  });

  it('parses Excel binary buffer conforming to profiling spec', () => {
    const data = [
      ['Question_Type', 'Topic', 'Sub_Topic', 'Difficulty_Granular', 'Difficulty_Categorical', 'Phase', 'ETA_Seconds'],
      ['MCQ', '3D Geometry', 'Distance & Lines', 7, 'Medium', 2, 180],
      ['NVQ', 'Vector Algebra', 'STP Max Value', 7, 'Medium', 2, 150],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const u8 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const res = parseMetadataExcel(u8);
    expect(res.errors).toHaveLength(0);
    expect(res.validRows).toHaveLength(2);
    expect(res.validRows[0].topic).toBe('3D Geometry');
    expect(res.validRows[1].questionType).toBe('NVQ');
  });

  it('generates Excel binary workbook and round-trips correctly via parseMetadataExcel', () => {
    const questions = [
      {
        position: 1,
        subject: 'maths',
        type: 'mcq',
        topic: '3D Geometry',
        chapter: '3D Geometry',
        difficulty: 8,
        expectedTimeS: 180,
        metadata: {
          questionType: 'MCQ',
          topic: '3D Geometry',
          subTopic: 'Equation of Plane',
          difficultyGranular: 8,
          difficultyCategorical: 'Hard',
          phase: 3,
          etaSeconds: 180,
        },
      },
      {
        position: 2,
        subject: 'maths',
        type: 'nvq',
        topic: 'Vectors',
        chapter: 'Vectors',
        difficulty: 6,
        expectedTimeS: 120,
        metadata: {
          questionType: 'NVQ',
          topic: 'Vector Algebra',
          subTopic: 'Cross Product',
          difficultyGranular: 6,
          difficultyCategorical: 'Medium',
          phase: 2,
          etaSeconds: 120,
        },
      },
    ];

    const excelBytes = generateMetadataExcel(questions);
    expect(excelBytes).toBeInstanceOf(Uint8Array);
    expect(excelBytes.length).toBeGreaterThan(100);

    const parsed = parseMetadataExcel(excelBytes);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.validRows).toHaveLength(2);

    expect(parsed.validRows[0].qno).toBe(1);
    expect(parsed.validRows[0].questionType).toBe('MCQ');
    expect(parsed.validRows[0].topic).toBe('3D Geometry');
    expect(parsed.validRows[0].subTopic).toBe('Equation of Plane');
    expect(parsed.validRows[0].difficultyGranular).toBe(8);
    expect(parsed.validRows[0].difficultyCategorical).toBe('Hard');
    expect(parsed.validRows[0].phase).toBe(3);
    expect(parsed.validRows[0].etaSeconds).toBe(180);

    expect(parsed.validRows[1].qno).toBe(2);
    expect(parsed.validRows[1].questionType).toBe('NVQ');
    expect(parsed.validRows[1].subTopic).toBe('Cross Product');
    expect(parsed.validRows[1].difficultyGranular).toBe(6);
    expect(parsed.validRows[1].phase).toBe(2);
    expect(parsed.validRows[1].etaSeconds).toBe(120);
  });

  it('catches invalid or missing header errors', () => {
    const csv = `WrongHeader1,WrongHeader2\nfoo,bar`;
    const res = parseMetadataCsv(csv);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0].field).toBe('header');
  });

  it('catches invalid Qno format when Qno column is explicitly given', () => {
    const csv = `Qno,Topic,Sub_Topic\ninvalid_q,3D Geometry,Lines`;
    const res = parseMetadataCsv(csv);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0].field).toBe('Qno');
  });
});
