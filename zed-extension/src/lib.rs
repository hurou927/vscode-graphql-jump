use zed_extension_api::{self as zed, LanguageServerId, Result};

struct GraphqlJumpExtension;

impl zed::Extension for GraphqlJumpExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &LanguageServerId,
        _worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        // CWD は work/graphql-jump/ だが実体は installed/graphql-jump/
        let extension_dir = std::env::current_dir()
            .map(|p| p.to_string_lossy().replace("/work/", "/installed/"))
            .unwrap_or_default();
        let server_path = format!("{}/server.bundle.js", extension_dir);

        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![server_path, "--stdio".to_string()],
            env: vec![],
        })
    }
}

zed::register_extension!(GraphqlJumpExtension);
