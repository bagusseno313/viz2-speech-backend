import unittest

from main import extract_ocr_lines


class ExtractOcrLinesTests(unittest.TestCase):
    def test_extracts_lines_and_confidence_from_paddleocr_payload(self):
        predictions = [
            {
                "res": {
                    "rec_texts": ["  SURAT KETERANGAN  ", "", "Nama: Budi"],
                    "rec_scores": [0.98, 0.4, 0.91],
                }
            }
        ]

        self.assertEqual(
            extract_ocr_lines(predictions),
            [
                {"text": "SURAT KETERANGAN", "confidence": 0.98},
                {"text": "Nama: Budi", "confidence": 0.91},
            ],
        )

    def test_accepts_prediction_objects_with_json_property(self):
        class Prediction:
            json = {
                "res": {
                    "rec_texts": ["Baris pertama"],
                    "rec_scores": [0.95],
                }
            }

        self.assertEqual(
            extract_ocr_lines([Prediction()]),
            [{"text": "Baris pertama", "confidence": 0.95}],
        )

    def test_empty_predictions_return_no_lines(self):
        self.assertEqual(extract_ocr_lines([]), [])
        self.assertEqual(
            extract_ocr_lines([{"res": {"rec_texts": [], "rec_scores": []}}]),
            [],
        )


if __name__ == "__main__":
    unittest.main()
