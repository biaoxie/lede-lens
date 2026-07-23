# Schema migrations

## 0.2.0

Schema `0.2.0` removes the `claims` and `relationships` fields from the analysis result.

Consumers should render the structural assessment, bounded conclusion, five article metrics, material issues, and their paragraph references. Results produced against schema `0.1.0` must not be validated as `0.2.0`.
