use zed_extension_api::{self as zed, LanguageServerId, Result};

struct GraphqlJumpExtension;

impl zed::Extension for GraphqlJumpExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let command = worktree
            .which("graphql-jump-lsp")
            .ok_or("graphql-jump-lsp not found in PATH. Run `npm link` in the graphql-jump-extension repo.")?;

        Ok(zed::Command {
            command,
            args: vec![],
            env: vec![],
        })
    }
}

zed::register_extension!(GraphqlJumpExtension);
